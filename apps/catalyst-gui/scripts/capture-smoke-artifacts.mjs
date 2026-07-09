import fs from 'fs';
import http from 'http';
import net from 'net';
import path from 'path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const rendererRoot = path.join(appRoot, 'dist', 'renderer');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'gui');
const casesRoot = path.join(artifactsRoot, 'cases');
const backendLogPath = path.join(artifactsRoot, 'backend.log');
const backendBaseUrl = process.env.CATALYST_API_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;

const screenshotNames = ['dashboard', 'operator', 'ui-lab', 'settings'];

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

function toRelativePosix(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

async function findOpenPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to allocate a preview port'));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

async function parseJsonResponse(response, errorPrefix) {
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `${errorPrefix} (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

async function backendRequest(pathname, init = {}) {
  const response = await fetch(`${backendBaseUrl}${pathname}`, {
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  return await parseJsonResponse(response, `Backend request failed for ${pathname}`);
}

async function ensureBackendReachable() {
  const response = await fetch(`${backendBaseUrl}/health`);
  const payload = await parseJsonResponse(response, 'Backend health check failed');
  if (payload.status !== 'ok') {
    throw new Error(`Backend health check failed: ${JSON.stringify(payload)}`);
  }
}

async function proxyBackendRequest(pathname, req, res) {
  const headers = { 'content-type': 'application/json' };
  const method = req.method || 'GET';
  let body;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await new Promise((resolve, reject) => {
      let buffer = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        buffer += chunk;
      });
      req.on('end', () => resolve(buffer));
      req.on('error', reject);
    });
  }

  const response = await fetch(`${backendBaseUrl}${pathname}`, {
    method,
    headers,
    body: typeof body === 'string' && body.length > 0 ? body : undefined,
  });
  const text = await response.text();
  res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8' });
  res.end(text);
}

function buildCasePaths(uiCaseId) {
  const caseRoot = path.join(casesRoot, uiCaseId);
  const screenshotsRoot = path.join(caseRoot, 'screenshots');
  return {
    caseRoot,
    caseRootRel: toRelativePosix(caseRoot),
    screenshotsRoot,
    screenshots: {
      dashboard: path.join(screenshotsRoot, 'dashboard.png'),
      operator: path.join(screenshotsRoot, 'operator.png'),
      'ui-lab': path.join(screenshotsRoot, 'ui-lab.png'),
      settings: path.join(screenshotsRoot, 'settings.png'),
    },
    reportJson: path.join(caseRoot, 'report.json'),
    reportMd: path.join(caseRoot, 'report.md'),
    manifestJson: path.join(caseRoot, 'manifest.json'),
    summaryMd: path.join(caseRoot, 'summary.md'),
    latestJson: path.join(artifactsRoot, 'latest.json'),
    latestMd: path.join(artifactsRoot, 'latest.md'),
  };
}

async function createOperatorCase() {
  const created = await backendRequest('/ai/cases', {
    method: 'POST',
    body: JSON.stringify({
      requester: 'ops-desk',
      domain: 'IDC',
      intent: 'verify_identity',
      summary: 'Populate Operator Inbox for backend-coupled GUI evidence capture.',
      input: { action: 'verify_identity', source: 'gui_ci_capture' },
    }),
  });
  const planned = await backendRequest(`/ai/cases/${created.id}/plan`, {
    method: 'POST',
    body: '{}',
  });
  return planned;
}

async function createUiCase() {
  const created = await backendRequest('/ai/ui/cases', {
    method: 'POST',
    body: JSON.stringify({
      requester: 'design-ops',
      surface: 'dashboard',
      intent: 'surface_review',
      summary: 'Capture backend-coupled GUI evidence pack anchored to ZK-GUI-001.',
    }),
  });
  const planned = await backendRequest(`/ai/ui/cases/${created.id}/plan`, {
    method: 'POST',
    body: '{}',
  });
  return planned;
}

async function startStaticServer(previewPort) {
  const bridgeState = {
    operations: [
      {
        id: 'op-gui-evidence-1',
        name: 'Backend-coupled GUI evidence capture',
        owner: 'Ops Desk',
        status: 'active',
        updatedAt: new Date().toISOString(),
        risk: 'medium',
      },
    ],
    notifications: {
      emailEnabled: true,
      slackEnabled: false,
      slackWebhookUrl: '',
    },
  };

  const server = http.createServer(async (req, res) => {
    try {
      const requestPath = req.url || '/';
      const url = new URL(requestPath, `http://127.0.0.1:${previewPort}`);

      if (url.pathname === '/__bridge/refresh') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, at: Date.now() }));
        return;
      }

      if (url.pathname === '/__bridge/sepolia-status') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: true,
            rpcUrl: 'backend-coupled-preview',
            chainId: 11155111,
            blockNumber: 123456,
            at: Date.now(),
          })
        );
        return;
      }

      if (url.pathname === '/__bridge/operations/list') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ operations: bridgeState.operations }));
        return;
      }

      if (url.pathname === '/__bridge/operations/create' && req.method === 'POST') {
        const payload = await new Promise((resolve, reject) => {
          let buffer = '';
          req.setEncoding('utf8');
          req.on('data', (chunk) => {
            buffer += chunk;
          });
          req.on('end', () => {
            try {
              resolve(buffer ? JSON.parse(buffer) : {});
            } catch (error) {
              reject(error);
            }
          });
          req.on('error', reject);
        });
        const next = {
          id: typeof payload?.id === 'string' ? payload.id : `op-${Date.now()}`,
          name: typeof payload?.name === 'string' ? payload.name : 'GUI evidence follow-up',
          owner: typeof payload?.owner === 'string' ? payload.owner : 'Ops Desk',
          status: payload?.status === 'active' || payload?.status === 'pending' || payload?.status === 'blocked' ? payload.status : 'pending',
          updatedAt: new Date().toISOString(),
          risk: payload?.risk === 'low' || payload?.risk === 'medium' || payload?.risk === 'high' ? payload.risk : 'medium',
        };
        bridgeState.operations = [next, ...bridgeState.operations].slice(0, 25);
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ operations: bridgeState.operations }));
        return;
      }

      if (url.pathname === '/__bridge/notifications/get') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ notifications: bridgeState.notifications }));
        return;
      }

      if (url.pathname === '/__bridge/notifications/update' && req.method === 'POST') {
        const payload = await new Promise((resolve, reject) => {
          let buffer = '';
          req.setEncoding('utf8');
          req.on('data', (chunk) => {
            buffer += chunk;
          });
          req.on('end', () => {
            try {
              resolve(buffer ? JSON.parse(buffer) : {});
            } catch (error) {
              reject(error);
            }
          });
          req.on('error', reject);
        });
        bridgeState.notifications = {
          emailEnabled: payload?.emailEnabled ?? bridgeState.notifications.emailEnabled,
          slackEnabled: payload?.slackEnabled ?? bridgeState.notifications.slackEnabled,
          slackWebhookUrl:
            typeof payload?.slackWebhookUrl === 'string' ? payload.slackWebhookUrl : bridgeState.notifications.slackWebhookUrl,
        };
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ notifications: bridgeState.notifications }));
        return;
      }

      if (url.pathname.startsWith('/__bridge/ai/') || url.pathname === '/__bridge/health') {
        const backendPath = url.pathname.replace(/^\/__bridge/, '') + url.search;
        await proxyBackendRequest(backendPath, req, res);
        return;
      }

      const staticPath = url.pathname === '/' ? '/index.html' : url.pathname;
      const filePath = path.join(rendererRoot, staticPath.replace(/^\//, ''));
      if (!filePath.startsWith(rendererRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      res.writeHead(200, { 'content-type': contentTypeFor(filePath) });
      res.end(fs.readFileSync(filePath));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown preview bridge error';
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: message }));
    }
  });

  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(previewPort, '127.0.0.1', resolve);
  });

  return server;
}

async function captureScreenshots({ previewPort, casePaths }) {
  fs.mkdirSync(casePaths.screenshotsRoot, { recursive: true });
  const previewUrl = `http://127.0.0.1:${previewPort}`;
  const server = await startStaticServer(previewPort);

  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    await context.addInitScript(() => {
      window.matchMedia =
        window.matchMedia ||
        ((query) =>
          ({
            matches: query.includes('dark'),
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => false,
          }));

      const request = async (pathname, init = {}) => {
        const response = await fetch(`/__bridge${pathname}`, {
          headers: { 'content-type': 'application/json', ...(init.headers || {}) },
          ...init,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || `Bridge request failed for ${pathname}`);
        }
        return payload;
      };

      window.catalyst = {
        refresh: async () => request('/refresh'),
        sepoliaStatus: async () => request('/sepolia-status'),
        operationsList: async () => request('/operations/list'),
        operationsCreate: async (input) =>
          request('/operations/create', {
            method: 'POST',
            body: JSON.stringify(input ?? {}),
          }),
        notificationsGet: async () => request('/notifications/get'),
        notificationsUpdate: async (patch) =>
          request('/notifications/update', {
            method: 'POST',
            body: JSON.stringify(patch ?? {}),
          }),
        aiCasesList: async () => request('/ai/cases'),
        aiCaseCreate: async (input) =>
          request('/ai/cases', {
            method: 'POST',
            body: JSON.stringify(input ?? {}),
          }),
        aiCasePlan: async (caseId) =>
          request(`/ai/cases/${caseId}/plan`, {
            method: 'POST',
            body: '{}',
          }),
        aiCaseApprove: async (caseId, input) =>
          request(`/ai/cases/${caseId}/approve`, {
            method: 'POST',
            body: JSON.stringify(input ?? {}),
          }),
        aiCaseExecute: async (caseId, input) =>
          request(`/ai/cases/${caseId}/execute`, {
            method: 'POST',
            body: JSON.stringify(input ?? {}),
          }),
        aiCaseReport: async (caseId) => request(`/ai/cases/${caseId}/report`),
        aiReleaseReadiness: async (domain) =>
          request(domain ? `/ai/release/readiness?domain=${encodeURIComponent(domain)}` : '/ai/release/readiness'),
        uiCasesList: async () => request('/ai/ui/cases'),
        uiCaseCreate: async (input) =>
          request('/ai/ui/cases', {
            method: 'POST',
            body: JSON.stringify(input ?? {}),
          }),
        uiCasePlan: async (caseId) =>
          request(`/ai/ui/cases/${caseId}/plan`, {
            method: 'POST',
            body: '{}',
          }),
        uiCaseReport: async (caseId) => request(`/ai/ui/cases/${caseId}/report`),
      };
    });

    const page = await context.newPage();
    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await page.screenshot({ path: casePaths.screenshots.dashboard, fullPage: true });

    await page.getByRole('button', { name: 'Operator' }).click();
    await page.getByRole('heading', { name: 'Clockchain Operator AI' }).waitFor();
    await page.screenshot({ path: casePaths.screenshots.operator, fullPage: true });

    await page.getByRole('button', { name: 'UI Lab' }).click();
    await page.getByRole('heading', { name: 'Open UI case' }).waitFor();
    await page.screenshot({ path: casePaths.screenshots['ui-lab'], fullPage: true });

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('heading', { name: 'Activation' }).waitFor();
    await page.screenshot({ path: casePaths.screenshots.settings, fullPage: true });

    await browser.close();
    return previewUrl;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function buildSummaryMarkdown({ manifest, previewUrl }) {
  const readiness = manifest.releaseReadiness || {};
  const latestGuiEvidence = readiness.latestGuiEvidence;
  return [
    '# GUI Evidence Pack',
    '',
    `- UI case: \`${manifest.uiCaseId}\``,
    `- Operator case: \`${manifest.operatorCaseId || '--'}\``,
    `- Trace: \`${manifest.traceId || 'GUI-001'}\``,
    `- Generated: \`${manifest.generatedAt}\``,
    `- Capture mode: \`${manifest.captureMode}\``,
    `- Backend: \`${manifest.backendBaseUrl}\``,
    `- Preview: \`${previewUrl}\``,
    ...(manifest.artifacts.backendLog ? [`- Backend log: \`${manifest.artifacts.backendLog}\``] : []),
    '',
    '## Release readiness',
    `- Gate: \`${readiness.releaseGate || 'unknown'}\``,
    `- Coverage ratio: \`${String(readiness.coverageRatio ?? '--')}\``,
    `- Errors: \`${Array.isArray(readiness.errors) ? readiness.errors.length : 0}\``,
    `- Critical failures: \`${Array.isArray(readiness.criticalFailures) ? readiness.criticalFailures.length : 0}\``,
    ...(latestGuiEvidence
      ? [
          `- Latest GUI evidence: \`${latestGuiEvidence.uiCaseId}\``,
          `- Latest manifest: \`${latestGuiEvidence.manifestPath}\``,
        ]
      : []),
    '',
    '## Artifacts',
    `- Manifest: \`${manifest.artifacts.manifestJson}\``,
    `- Summary: \`${manifest.artifacts.summaryMd}\``,
    `- Report JSON: \`${manifest.artifacts.reportJson}\``,
    `- Report MD: \`${manifest.artifacts.reportMd}\``,
    '',
    '## Screenshots',
    ...Object.values(manifest.screenshots).map((entry) => `- \`${entry}\``),
    '',
    '## Evidence refs',
    ...manifest.evidenceRefs.map((entry) => `- \`${entry}\``),
  ].join('\n');
}

async function main() {
  fs.mkdirSync(artifactsRoot, { recursive: true });
  fs.mkdirSync(casesRoot, { recursive: true });
  if (!fs.existsSync(path.join(rendererRoot, 'index.html'))) {
    throw new Error('Renderer build not found. Run `npm run build` before `npm run smoke:artifacts`.');
  }

  await ensureBackendReachable();
  const uiCase = await createUiCase();
  const operatorCase = await createOperatorCase();
  const casePaths = buildCasePaths(uiCase.id);
  const previewPort = await findOpenPort();
  const previewUrl = await captureScreenshots({ previewPort, casePaths });

  const report = await backendRequest(`/ai/ui/cases/${uiCase.id}/report`);
  if (!fs.existsSync(casePaths.reportJson) || !fs.existsSync(casePaths.reportMd)) {
    throw new Error(`UI report artifacts were not written for ${uiCase.id}`);
  }

  const manifest = {
    schemaVersion: 1,
    uiCaseId: uiCase.id,
    operatorCaseId: operatorCase.id,
    traceId: report.traceId || uiCase.traceId,
    zkRefs: Array.isArray(report.zkRefs) ? report.zkRefs : uiCase.zkRefs || [],
    generatedAt: report.generatedAt || new Date().toISOString(),
    captureMode: 'backend_coupled',
    backendBaseUrl,
    artifacts: {
      caseRoot: toRelativePosix(casePaths.caseRoot),
      reportJson: toRelativePosix(casePaths.reportJson),
      reportMd: toRelativePosix(casePaths.reportMd),
      manifestJson: toRelativePosix(casePaths.manifestJson),
      summaryMd: toRelativePosix(casePaths.summaryMd),
      latestJson: toRelativePosix(casePaths.latestJson),
      latestMd: toRelativePosix(casePaths.latestMd),
      ...(fs.existsSync(backendLogPath) ? { backendLog: toRelativePosix(backendLogPath) } : {}),
    },
    screenshots: Object.fromEntries(
      Object.entries(casePaths.screenshots).map(([key, value]) => [key, toRelativePosix(value)])
    ),
    evidenceRefs: [...new Set([
      ...(Array.isArray(report.evidenceRefs) ? report.evidenceRefs : []),
      toRelativePosix(casePaths.manifestJson),
      toRelativePosix(casePaths.summaryMd),
      ...(fs.existsSync(backendLogPath) ? [toRelativePosix(backendLogPath)] : []),
    ])].sort(),
    releaseReadiness: {},
  };

  fs.mkdirSync(casePaths.caseRoot, { recursive: true });
  fs.writeFileSync(casePaths.manifestJson, JSON.stringify(manifest, null, 2), 'utf8');
  const readiness = await backendRequest('/ai/release/readiness?domain=GUI');
  manifest.releaseReadiness = readiness;
  fs.writeFileSync(casePaths.manifestJson, JSON.stringify(manifest, null, 2), 'utf8');

  const summaryMarkdown = buildSummaryMarkdown({ manifest, previewUrl });
  fs.writeFileSync(casePaths.summaryMd, summaryMarkdown, 'utf8');

  const latestPointer = {
    uiCaseId: manifest.uiCaseId,
    manifestPath: manifest.artifacts.manifestJson,
    summaryPath: manifest.artifacts.summaryMd,
    generatedAt: manifest.generatedAt,
    captureMode: manifest.captureMode,
  };
  fs.writeFileSync(casePaths.latestJson, JSON.stringify(latestPointer, null, 2), 'utf8');
  fs.writeFileSync(
    casePaths.latestMd,
    [
      '# Latest GUI Evidence',
      '',
      `- UI case: \`${latestPointer.uiCaseId}\``,
      `- Manifest: \`${latestPointer.manifestPath}\``,
      `- Summary: \`${latestPointer.summaryPath}\``,
      `- Generated: \`${latestPointer.generatedAt}\``,
      `- Capture mode: \`${latestPointer.captureMode}\``,
    ].join('\n'),
    'utf8'
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
