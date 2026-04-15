import { app, BrowserWindow, ipcMain, shell } from 'electron';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const isDev = !!process.env.ELECTRON_START_URL;
let mainWindow: BrowserWindow | null = null;

for (const envPath of [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '..', '.env')
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

type JsonRpcOk<T> = { jsonrpc: '2.0'; id: number; result: T };
type JsonRpcErr = { jsonrpc: '2.0'; id: number; error: { code: number; message: string; data?: unknown } };
type JsonRpcResponse<T> = JsonRpcOk<T> | JsonRpcErr;
type OperationStatus = 'active' | 'pending' | 'blocked';
type RiskLevel = 'low' | 'medium' | 'high';
type OperationRecord = {
  id: string;
  name: string;
  owner: string;
  status: OperationStatus;
  updatedAt: string;
  risk: RiskLevel;
};
type NotificationSettings = {
  emailEnabled: boolean;
  slackEnabled: boolean;
  slackWebhookUrl: string;
};
type ControlRoomState = {
  operations: OperationRecord[];
  notifications: NotificationSettings;
};
type BackendError = { error?: string };
type OperatorExecutionMode = 'dry_run' | 'live';
type UiSurface = 'dashboard' | 'operator' | 'settings';
type UiCopilotIntent = 'surface_review' | 'component_brief' | 'layout_proposal' | 'a11y_audit' | 'design_regression';
type UiCaseStatus = 'open' | 'planned' | 'reviewed';
type OperatorCaseRecord = {
  id: string;
  domain: 'VAL' | 'EVT' | 'IDC' | 'RMP';
  intent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'planned' | 'awaiting_approval' | 'approved' | 'executing' | 'completed' | 'blocked' | 'failed';
  approvalState: 'not_required' | 'pending' | 'approved' | 'rejected';
  requester: string;
  updatedAt: string;
  traceContext?: {
    traceId?: string;
    reqId?: string;
    ctrId?: string;
    zkRefs?: string[];
    evidenceRefs?: string[];
    eid?: string;
    vids?: string[];
  };
  plan?: {
    steps: Array<{
      id: string;
      label: string;
      kind: string;
      adapter?: string;
    }>;
  };
  report?: {
    summary: string;
    narrative: string;
    evidence: string[];
    openRisks: string[];
    recommendations: string[];
    timeline: Array<Record<string, unknown>>;
  };
};
type UiProposal = {
  tokens: string[];
  layoutChanges: string[];
  componentChanges: string[];
  a11yChecks: string[];
  acceptanceCriteria: string[];
};
type UiReviewReport = {
  id: string;
  caseId: string;
  generatedAt: string;
  summary: string;
  recommendations: string[];
  regressions: string[];
  screenshots: string[];
  evidenceRefs: string[];
  zkRefs: string[];
  traceId?: string;
  artifactManifestPath?: string;
  proposal: UiProposal;
};
type UiCopilotCase = {
  id: string;
  requester: string;
  surface: UiSurface;
  intent: UiCopilotIntent;
  summary: string;
  status: UiCaseStatus;
  traceId?: string;
  zkRefs: string[];
  createdAt: string;
  updatedAt: string;
  proposal?: UiProposal;
  report?: UiReviewReport;
};
type ReleaseReadiness = {
  releaseGate: 'pass' | 'fail';
  coverageRatio?: number;
  errors: string[];
  criticalFailures: string[];
  envChecks: {
    rpcConfigured: boolean;
    privateKeyConfigured: boolean;
    deployScriptPresent: boolean;
    hardhatConfigPresent: boolean;
    liveDeployEnabled: boolean;
  };
  latestGuiEvidence?: {
    uiCaseId: string;
    manifestPath: string;
    generatedAt: string;
    captureMode: 'backend_coupled';
  };
};

const defaultControlRoomState: ControlRoomState = {
  operations: [],
  notifications: {
    emailEnabled: false,
    slackEnabled: false,
    slackWebhookUrl: ''
  }
};

function getBackendBaseUrl(): string {
  return process.env.CATALYST_API_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;
}

function getControlRoomStatePath(): string {
  return path.join(app.getPath('userData'), 'control-room-state.json');
}

function readControlRoomState(): ControlRoomState {
  const statePath = getControlRoomStatePath();
  if (!fs.existsSync(statePath)) {
    fs.writeFileSync(statePath, JSON.stringify(defaultControlRoomState, null, 2), 'utf8');
    return defaultControlRoomState;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8')) as Partial<ControlRoomState>;
    const operations = Array.isArray(parsed.operations) ? parsed.operations : [];
    const notifications = parsed.notifications ?? defaultControlRoomState.notifications;
    return {
      operations: operations.filter(
        (row): row is OperationRecord =>
          Boolean(
            row &&
              typeof row.id === 'string' &&
              typeof row.name === 'string' &&
              typeof row.owner === 'string' &&
              typeof row.updatedAt === 'string' &&
              (row.status === 'active' || row.status === 'pending' || row.status === 'blocked') &&
              (row.risk === 'low' || row.risk === 'medium' || row.risk === 'high')
          )
      ),
      notifications: {
        emailEnabled: Boolean(notifications.emailEnabled),
        slackEnabled: Boolean(notifications.slackEnabled),
        slackWebhookUrl: typeof notifications.slackWebhookUrl === 'string' ? notifications.slackWebhookUrl : ''
      }
    };
  } catch {
    fs.writeFileSync(statePath, JSON.stringify(defaultControlRoomState, null, 2), 'utf8');
    return defaultControlRoomState;
  }
}

function writeControlRoomState(state: ControlRoomState): void {
  fs.writeFileSync(getControlRoomStatePath(), JSON.stringify(state, null, 2), 'utf8');
}

function asStatus(value: unknown): OperationStatus {
  return value === 'active' || value === 'pending' || value === 'blocked' ? value : 'pending';
}

function asRisk(value: unknown): RiskLevel {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
}

async function jsonRpc<T>(url: string, method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status} ${res.statusText}`);
  }

  const payload = (await res.json()) as JsonRpcResponse<T>;
  if ('error' in payload) {
    throw new Error(`RPC ${payload.error.code}: ${payload.error.message}`);
  }

  return payload.result;
}

async function backendRequest<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getBackendBaseUrl()}${pathname}`, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });

  const payload = (await response.json()) as T & BackendError;
  if (!response.ok) {
    throw new Error(payload.error || `Backend HTTP ${response.status}`);
  }

  return payload;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Catalyst GUI',
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#0b1220',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
    mainWindow.webContents.on('did-fail-load', () => {
      mainWindow?.loadURL(process.env.ELECTRON_START_URL!);
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/renderer/index.html');
    mainWindow.loadFile(indexPath);
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('operations:list', () => {
  const state = readControlRoomState();
  return { operations: state.operations };
});

ipcMain.handle('operations:create', (_event, input: Partial<OperationRecord>) => {
  const state = readControlRoomState();
  const next: OperationRecord = {
    id: typeof input?.id === 'string' && input.id ? input.id : `op-${Date.now()}`,
    name: typeof input?.name === 'string' && input.name ? input.name : 'New Clockchain operation',
    owner: typeof input?.owner === 'string' && input.owner ? input.owner : 'Ops Desk',
    status: asStatus(input?.status),
    updatedAt: new Date().toISOString(),
    risk: asRisk(input?.risk)
  };
  const operations = [next, ...state.operations].slice(0, 25);
  writeControlRoomState({ ...state, operations });
  return { operations };
});

ipcMain.handle('notifications:get', () => {
  const state = readControlRoomState();
  return { notifications: state.notifications };
});

ipcMain.handle('notifications:update', (_event, patch: Partial<NotificationSettings>) => {
  const state = readControlRoomState();
  const notifications: NotificationSettings = {
    emailEnabled: patch?.emailEnabled ?? state.notifications.emailEnabled,
    slackEnabled: patch?.slackEnabled ?? state.notifications.slackEnabled,
    slackWebhookUrl: typeof patch?.slackWebhookUrl === 'string' ? patch.slackWebhookUrl : state.notifications.slackWebhookUrl
  };
  writeControlRoomState({ ...state, notifications });
  return { notifications };
});

ipcMain.handle('refresh', () => {
  return { ok: true, at: Date.now() };
});

ipcMain.handle('sepolia:status', async () => {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
  try {
    const [chainIdHex, blockHex] = await Promise.all([
      jsonRpc<string>(rpcUrl, 'eth_chainId'),
      jsonRpc<string>(rpcUrl, 'eth_blockNumber')
    ]);

    const chainId = Number.parseInt(chainIdHex, 16);
    const blockNumber = Number.parseInt(blockHex, 16);

    return { ok: true, rpcUrl, chainId, blockNumber, at: Date.now() };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown RPC error';
    return { ok: false, rpcUrl, error: message, at: Date.now() };
  }
});

ipcMain.handle('ai:cases:list', async () => backendRequest<{ cases: OperatorCaseRecord[] }>('/ai/cases'));
ipcMain.handle('ai:cases:create', async (_event, input: Record<string, unknown>) =>
  backendRequest<OperatorCaseRecord>('/ai/cases', {
    method: 'POST',
    body: JSON.stringify(input)
  })
);
ipcMain.handle('ai:cases:plan', async (_event, caseId: string) =>
  backendRequest<OperatorCaseRecord>(`/ai/cases/${caseId}/plan`, { method: 'POST', body: '{}' })
);
ipcMain.handle('ai:cases:approve', async (_event, caseId: string, input: Record<string, unknown>) =>
  backendRequest<OperatorCaseRecord>(`/ai/cases/${caseId}/approve`, {
    method: 'POST',
    body: JSON.stringify(input)
  })
);
ipcMain.handle(
  'ai:cases:execute',
  async (_event, caseId: string, input: { mode?: OperatorExecutionMode; requestedBy?: string }) =>
    backendRequest<{ case: OperatorCaseRecord; receipt: Record<string, unknown>; report: OperatorCaseRecord['report'] }>(
      `/ai/cases/${caseId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify(input ?? {})
      }
    )
);
ipcMain.handle('ai:cases:report', async (_event, caseId: string) =>
  backendRequest<OperatorCaseRecord['report']>(`/ai/cases/${caseId}/report`)
);
ipcMain.handle('ai:release:readiness', async (_event, domain?: string) =>
  backendRequest<ReleaseReadiness>(domain ? `/ai/release/readiness?domain=${encodeURIComponent(domain)}` : '/ai/release/readiness')
);
ipcMain.handle('ui:cases:list', async () => backendRequest<{ cases: UiCopilotCase[] }>('/ai/ui/cases'));
ipcMain.handle('ui:cases:create', async (_event, input: Record<string, unknown>) =>
  backendRequest<UiCopilotCase>('/ai/ui/cases', {
    method: 'POST',
    body: JSON.stringify(input)
  })
);
ipcMain.handle('ui:cases:plan', async (_event, caseId: string) =>
  backendRequest<UiCopilotCase>(`/ai/ui/cases/${caseId}/plan`, {
    method: 'POST',
    body: '{}'
  })
);
ipcMain.handle('ui:cases:report', async (_event, caseId: string) =>
  backendRequest<UiReviewReport>(`/ai/ui/cases/${caseId}/report`)
);
