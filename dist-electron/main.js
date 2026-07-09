"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const isDev = !!process.env.ELECTRON_START_URL;
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
