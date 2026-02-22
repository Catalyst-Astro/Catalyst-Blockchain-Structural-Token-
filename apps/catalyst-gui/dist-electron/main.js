"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const isDev = !!process.env.ELECTRON_START_URL;
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
function createWindow() {
    const win = new electron_1.BrowserWindow({
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
    if (isDev && process.env.ELECTRON_START_URL) {
        win.loadURL(process.env.ELECTRON_START_URL);
        win.webContents.on('did-fail-load', () => {
            win.loadURL(process.env.ELECTRON_START_URL);
        });
        win.webContents.setWindowOpenHandler(({ url }) => {
            electron_1.shell.openExternal(url);
            return { action: 'deny' };
        });
    }
    else {
        const indexPath = path_1.default.join(__dirname, '../dist/renderer/index.html');
        win.loadFile(indexPath);
        win.webContents.setWindowOpenHandler(({ url }) => {
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
electron_1.ipcMain.handle('operations:list', () => {
    const state = readControlRoomState();
    return { ok: true, operations: state.operations };
});
electron_1.ipcMain.handle('operations:create', (_event, payload) => {
    const state = readControlRoomState();
    const id = `op_${Date.now()}_${state.operations.length + 1}`;
    const today = new Date().toISOString().slice(0, 10);
    const operation = {
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
electron_1.ipcMain.handle('notifications:get', () => {
    const state = readControlRoomState();
    return { ok: true, notifications: state.notifications };
});
electron_1.ipcMain.handle('notifications:update', (_event, payload) => {
    const state = readControlRoomState();
    const next = {
        ...state.notifications,
        ...payload,
        emailEnabled: payload.emailEnabled ?? state.notifications.emailEnabled,
        slackEnabled: payload.slackEnabled ?? state.notifications.slackEnabled,
        slackWebhookUrl: typeof payload.slackWebhookUrl === 'string'
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
