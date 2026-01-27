"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const isDev = !!process.env.ELECTRON_START_URL;
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
