import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import { chromium } from 'playwright';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const rendererRoot = path.join(appRoot, 'dist', 'renderer');
const artifactsRoot = path.join(repoRoot, 'artifacts', 'gui');
const screenshotsDir = path.join(artifactsRoot, 'screenshots');
const reportPath = path.join(artifactsRoot, 'smoke-report.md');
const jsonPath = path.join(artifactsRoot, 'smoke-report.json');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const mockPayload = {
  operations: [
    {
      id: 'op-1',
      name: 'Operator escalation',
      owner: 'Ops Desk',
      status: 'active',
      updatedAt: '2026-03-20 10:00',
      risk: 'medium'
    }
  ],
  notifications: { emailEnabled: true, slackEnabled: false, slackWebhookUrl: '' },
  operatorCase: {
    id: 'case-operator-1',
    domain: 'IDC',
    intent: 'verify_identity',
    severity: 'medium',
    status: 'planned',
    approvalState: 'not_required',
    requester: 'ops-desk',
    updatedAt: new Date('2026-03-20T10:00:00Z').toISOString(),
    traceContext: {
      traceId: 'IDC-001',
      reqId: 'REQ-IDC-001',
      ctrId: 'CTR-IDC-001',
      zkRefs: ['ZK-IDC-001'],
      evidenceRefs: ['EVD-IDC-001']
    },
    plan: {
      kernelDirectives: ['Keep the kernel decision visible in the case detail.'],
      steps: [
        { id: 'resolve_trace', label: 'Resolve ZK and NTX trace context', kind: 'trace' },
        { id: 'dry_run', label: 'Run deterministic adapter in dry-run mode', kind: 'execute' }
      ]
    }
  },
  operatorReport: {
    summary: 'IDC verify_identity case is planned with a governed decision kernel.',
    narrative: 'The case stays anchored to the trace and keeps dry-run before runtime execution.',
    evidence: ['EVD-IDC-001'],
    openRisks: [],
    recommendations: ['Maintain the same trace context in downstream evidence and reports.'],
    timeline: []
  },
  uiCase: {
    id: 'ui-case-1',
    requester: 'design-ops',
    surface: 'dashboard',
    intent: 'surface_review',
    summary: 'Review the dashboard surface and preserve the critical scan path.',
    status: 'planned',
    traceId: 'GUI-001',
    zkRefs: ['ZK-GUI-001'],
    createdAt: new Date('2026-03-20T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-03-20T11:00:00Z').toISOString(),
    proposal: {
      tokens: ['--primary', '--card'],
      layoutChanges: ['Keep hero and KPI band grouped.'],
      componentChanges: ['Preserve KPI tiles and searchable ledger.'],
      a11yChecks: ['Search control must keep explicit label.'],
      acceptanceCriteria: ['Dashboard remains legible without horizontal scrolling.']
    }
  },
  uiReport: {
    id: 'ui-report-1',
    caseId: 'ui-case-1',
    generatedAt: new Date('2026-03-20T11:05:00Z').toISOString(),
    summary: 'dashboard surface_review stays anchored to GUI-001 and emits a governed UI proposal.',
    recommendations: ['Review the proposal before merging any UI change.'],
    regressions: [],
    screenshots: ['artifacts/gui/screenshots/dashboard.png'],
    evidenceRefs: ['backend/database/ui_reviews.jsonl', 'artifacts/gui/reports/ui-case-1.md'],
    zkRefs: ['ZK-GUI-001'],
    traceId: 'GUI-001',
    proposal: {
      tokens: ['--primary', '--card'],
      layoutChanges: ['Keep hero and KPI band grouped.'],
      componentChanges: ['Preserve KPI tiles and searchable ledger.'],
      a11yChecks: ['Search control must keep explicit label.'],
      acceptanceCriteria: ['Dashboard remains legible without horizontal scrolling.']
    }
  }
};

function createMatchMedia() {
  return (query) => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  });
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

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function startStaticServer(previewPort) {
  const server = http.createServer((req, res) => {
    const requestPath = req.url && req.url !== '/' ? req.url.split('?')[0] : '/index.html';
    const filePath = path.join(rendererRoot, requestPath === '/' ? 'index.html' : requestPath.replace(/^\//, ''));

    if (!filePath.startsWith(rendererRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'content-type': contentTypeFor(filePath) });
    res.end(fs.readFileSync(filePath));
  });

  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(previewPort, '127.0.0.1', resolve);
  });

  return server;
}

async function captureScreenshots(previewPort) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const previewUrl = `http://127.0.0.1:${previewPort}`;
  const server = await startStaticServer(previewPort);
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    await context.addInitScript(({ mock }) => {
      window.matchMedia = window.matchMedia || ((query) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false
      }));
      window.catalyst = {
        refresh: async () => ({ ok: true, at: Date.now() }),
        sepoliaStatus: async () => ({ ok: true, rpcUrl: 'https://rpc.sepolia.org', chainId: 11155111, blockNumber: 123456, at: Date.now() }),
        operationsList: async () => ({ operations: mock.operations }),
        operationsCreate: async () => ({ operations: mock.operations }),
        notificationsGet: async () => ({ notifications: mock.notifications }),
        notificationsUpdate: async (patch) => ({ notifications: { ...mock.notifications, ...patch } }),
        aiCasesList: async () => ({ cases: [mock.operatorCase] }),
        aiCaseCreate: async () => mock.operatorCase,
        aiCasePlan: async () => mock.operatorCase,
        aiCaseApprove: async () => mock.operatorCase,
        aiCaseExecute: async () => ({ case: mock.operatorCase, receipt: {}, report: mock.operatorReport }),
        aiCaseReport: async () => mock.operatorReport,
        aiReleaseReadiness: async () => ({
          releaseGate: 'pass',
          coverageRatio: 1,
          errors: [],
          criticalFailures: [],
          envChecks: {
            rpcConfigured: true,
            privateKeyConfigured: false,
            deployScriptPresent: true,
            hardhatConfigPresent: true,
            liveDeployEnabled: false
          }
        }),
        uiCasesList: async () => ({ cases: [mock.uiCase] }),
        uiCaseCreate: async () => mock.uiCase,
        uiCasePlan: async () => mock.uiCase,
        uiCaseReport: async () => mock.uiReport
      };
    }, { mock: mockPayload });

    const page = await context.newPage();
    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png'), fullPage: true });

    await page.getByRole('button', { name: 'Operator' }).click();
    await page.getByRole('heading', { name: 'Clockchain Operator AI' }).waitFor();
    await page.screenshot({ path: path.join(screenshotsDir, 'operator.png'), fullPage: true });

    await page.getByRole('button', { name: 'UI Lab' }).click();
    await page.getByRole('heading', { name: 'Open UI case' }).waitFor();
    await page.screenshot({ path: path.join(screenshotsDir, 'ui-lab.png'), fullPage: true });

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('heading', { name: 'Activation' }).waitFor();
    await page.screenshot({ path: path.join(screenshotsDir, 'settings.png'), fullPage: true });

    await browser.close();
    return previewUrl;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  fs.mkdirSync(artifactsRoot, { recursive: true });
  if (!fs.existsSync(path.join(rendererRoot, 'index.html'))) {
    throw new Error('Renderer build not found. Run `npm run build` before `npm run smoke:artifacts`.');
  }
  const previewPort = await findOpenPort();
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    writable: true,
    value: createMatchMedia()
  });

  const previewUrl = await captureScreenshots(previewPort);

  const screenshots = [
    'artifacts/gui/screenshots/dashboard.png',
    'artifacts/gui/screenshots/operator.png',
    'artifacts/gui/screenshots/ui-lab.png',
    'artifacts/gui/screenshots/settings.png'
  ];
  const payload = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    screenshots,
    notes: [
      'Renderer smoke artifacts captured with mocked Electron bridge.',
      'These screenshots anchor the GUI domain evidence for ZK-GUI-001.',
    ]
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(
    reportPath,
    [
      '# GUI Smoke Artifacts',
      '',
      `- Preview: \`${previewUrl}\``,
      `- Generated: \`${payload.generatedAt}\``,
      '',
      '## Screenshots',
      ...screenshots.map((entry) => `- \`${entry}\``),
      '',
      '## Notes',
      ...payload.notes.map((entry) => `- ${entry}`),
    ].join('\n'),
    'utf8'
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
