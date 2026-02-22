import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const isDev = !!process.env.ELECTRON_START_URL;

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

const defaultControlRoomState: ControlRoomState = {
  operations: [],
  notifications: {
    emailEnabled: false,
    slackEnabled: false,
    slackWebhookUrl: ''
  }
};

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

function createWindow() {
  const win = new BrowserWindow({
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

  if (isDev && process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
    win.webContents.on('did-fail-load', () => {
      win.loadURL(process.env.ELECTRON_START_URL!);
    });
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/renderer/index.html');
    win.loadFile(indexPath);
    win.webContents.setWindowOpenHandler(({ url }) => {
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

ipcMain.handle('operations:list', () => {
  const state = readControlRoomState();
  return { ok: true, operations: state.operations };
});

ipcMain.handle('operations:create', (_event, payload: Partial<OperationRecord>) => {
  const state = readControlRoomState();
  const id = `op_${Date.now()}_${state.operations.length + 1}`;
  const today = new Date().toISOString().slice(0, 10);
  const operation: OperationRecord = {
    id,
    name: payload.name?.trim() || `Ops Intake ${state.operations.length + 1}`,
    owner: payload.owner?.trim() || 'Control Room',
    status: asStatus(payload.status),
    updatedAt: payload.updatedAt || today,
    risk: asRisk(payload.risk)
  };

  state.operations = [operation, ...state.operations];
  writeControlRoomState(state);
  return { ok: true, operation, operations: state.operations };
});

ipcMain.handle('notifications:get', () => {
  const state = readControlRoomState();
  return { ok: true, notifications: state.notifications };
});

ipcMain.handle('notifications:update', (_event, payload: Partial<NotificationSettings>) => {
  const state = readControlRoomState();
  const next: NotificationSettings = {
    ...state.notifications,
    ...payload,
    emailEnabled: payload.emailEnabled ?? state.notifications.emailEnabled,
    slackEnabled: payload.slackEnabled ?? state.notifications.slackEnabled,
    slackWebhookUrl:
      typeof payload.slackWebhookUrl === 'string'
        ? payload.slackWebhookUrl.trim()
        : state.notifications.slackWebhookUrl
  };

  // A Slack integration cannot be enabled without a webhook URL.
  if (next.slackEnabled && next.slackWebhookUrl.length === 0) {
    throw new Error('Slack webhook URL is required before enabling Slack notifications.');
  }

  state.notifications = next;
  writeControlRoomState(state);
  return { ok: true, notifications: state.notifications };
});
