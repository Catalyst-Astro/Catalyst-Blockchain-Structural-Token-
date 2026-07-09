"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const isDev = !!process.env.ELECTRON_START_URL;
let mainWindow = null;
for (const envPath of [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(process.cwd(), '..', '..', '.env')
]) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
        break;
    }
}
const defaultControlRoomState = {
    operations: [],
    notifications: {
        emailEnabled: false,
        slackEnabled: false,
        slackWebhookUrl: ''
    }
};
function getBackendBaseUrl() {
    return process.env.CATALYST_API_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;
}
function getControlRoomStatePath() {
    return path_1.default.join(electron_1.app.getPath('userData'), 'control-room-state.json');
}
function readControlRoomState() {
    const statePath = getControlRoomStatePath();
    if (!fs_1.default.existsSync(statePath)) {
        fs_1.default.writeFileSync(statePath, JSON.stringify(defaultControlRoomState, null, 2), 'utf8');
        return defaultControlRoomState;
    }
    try {
        const parsed = JSON.parse(fs_1.default.readFileSync(statePath, 'utf8'));
        const operations = Array.isArray(parsed.operations) ? parsed.operations : [];
        const notifications = parsed.notifications ?? defaultControlRoomState.notifications;
        return {
            operations: operations.filter((row) => Boolean(row &&
                typeof row.id === 'string' &&
                typeof row.name === 'string' &&
                typeof row.owner === 'string' &&
                typeof row.updatedAt === 'string' &&
                (row.status === 'active' || row.status === 'pending' || row.status === 'blocked') &&
                (row.risk === 'low' || row.risk === 'medium' || row.risk === 'high'))),
            notifications: {
                emailEnabled: Boolean(notifications.emailEnabled),
                slackEnabled: Boolean(notifications.slackEnabled),
                slackWebhookUrl: typeof notifications.slackWebhookUrl === 'string' ? notifications.slackWebhookUrl : ''
            }
        };
    }
    catch {
        fs_1.default.writeFileSync(statePath, JSON.stringify(defaultControlRoomState, null, 2), 'utf8');
        return defaultControlRoomState;
    }
}
function writeControlRoomState(state) {
    fs_1.default.writeFileSync(getControlRoomStatePath(), JSON.stringify(state, null, 2), 'utf8');
}
function asStatus(value) {
    return value === 'active' || value === 'pending' || value === 'blocked' ? value : 'pending';
}
function asRisk(value) {
    return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
}
async function jsonRpc(url, method, params = []) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
    });
    if (!res.ok) {
        throw new Error(`RPC HTTP ${res.status} ${res.statusText}`);
    }
    const payload = (await res.json());
    if ('error' in payload) {
        throw new Error(`RPC ${payload.error.code}: ${payload.error.message}`);
    }
    return payload.result;
}
async function backendRequest(pathname, init) {
    const response = await fetch(`${getBackendBaseUrl()}${pathname}`, {
        headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
        ...init
    });
    const payload = (await response.json());
    if (!response.ok) {
        throw new Error(payload.error || `Backend HTTP ${response.status}`);
    }
    return payload;
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, 'preload.js'),
            sandbox: true
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    if (isDev && process.env.ELECTRON_START_URL) {
        mainWindow.loadURL(process.env.ELECTRON_START_URL);
        mainWindow.webContents.on('did-fail-load', () => {
            mainWindow?.loadURL(process.env.ELECTRON_START_URL);
        });
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        });
    }
    else {
        const indexPath = path_1.default.join(__dirname, '../dist/renderer/index.html');
        mainWindow.loadFile(indexPath);
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        });
    }
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.ipcMain.handle('operations:list', () => {
    const state = readControlRoomState();
    return { operations: state.operations };
});
electron_1.ipcMain.handle('operations:create', (_event, input) => {
    const state = readControlRoomState();
    const next = {
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
electron_1.ipcMain.handle('notifications:get', () => {
    const state = readControlRoomState();
    return { notifications: state.notifications };
});
electron_1.ipcMain.handle('notifications:update', (_event, patch) => {
    const state = readControlRoomState();
    const notifications = {
        emailEnabled: patch?.emailEnabled ?? state.notifications.emailEnabled,
        slackEnabled: patch?.slackEnabled ?? state.notifications.slackEnabled,
        slackWebhookUrl: typeof patch?.slackWebhookUrl === 'string' ? patch.slackWebhookUrl : state.notifications.slackWebhookUrl
    };
    writeControlRoomState({ ...state, notifications });
    return { notifications };
});
electron_1.ipcMain.handle('refresh', () => {
    return { ok: true, at: Date.now() };
});
electron_1.ipcMain.handle('sepolia:status', async () => {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
    try {
        const [chainIdHex, blockHex] = await Promise.all([
            jsonRpc(rpcUrl, 'eth_chainId'),
            jsonRpc(rpcUrl, 'eth_blockNumber')
        ]);
        const chainId = Number.parseInt(chainIdHex, 16);
        const blockNumber = Number.parseInt(blockHex, 16);
        return { ok: true, rpcUrl, chainId, blockNumber, at: Date.now() };
    }
    catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown RPC error';
        return { ok: false, rpcUrl, error: message, at: Date.now() };
    }
});
electron_1.ipcMain.handle('ai:cases:list', async () => backendRequest('/ai/cases'));
electron_1.ipcMain.handle('ai:cases:create', async (_event, input) => backendRequest('/ai/cases', {
    method: 'POST',
    body: JSON.stringify(input)
}));
electron_1.ipcMain.handle('ai:cases:plan', async (_event, caseId) => backendRequest(`/ai/cases/${caseId}/plan`, { method: 'POST', body: '{}' }));
electron_1.ipcMain.handle('ai:cases:approve', async (_event, caseId, input) => backendRequest(`/ai/cases/${caseId}/approve`, {
    method: 'POST',
    body: JSON.stringify(input)
}));
electron_1.ipcMain.handle('ai:cases:execute', async (_event, caseId, input) => backendRequest(`/ai/cases/${caseId}/execute`, {
    method: 'POST',
    body: JSON.stringify(input ?? {})
}));
electron_1.ipcMain.handle('ai:cases:report', async (_event, caseId) => backendRequest(`/ai/cases/${caseId}/report`));
electron_1.ipcMain.handle('ai:release:readiness', async (_event, domain) => backendRequest(domain ? `/ai/release/readiness?domain=${encodeURIComponent(domain)}` : '/ai/release/readiness'));
electron_1.ipcMain.handle('ui:cases:list', async () => backendRequest('/ai/ui/cases'));
electron_1.ipcMain.handle('ui:cases:create', async (_event, input) => backendRequest('/ai/ui/cases', {
    method: 'POST',
    body: JSON.stringify(input)
}));
electron_1.ipcMain.handle('ui:cases:plan', async (_event, caseId) => backendRequest(`/ai/ui/cases/${caseId}/plan`, {
    method: 'POST',
    body: '{}'
}));
electron_1.ipcMain.handle('ui:cases:report', async (_event, caseId) => backendRequest(`/ai/ui/cases/${caseId}/report`));
