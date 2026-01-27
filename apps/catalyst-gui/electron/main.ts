import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';

const isDev = !!process.env.ELECTRON_START_URL;

type JsonRpcOk<T> = { jsonrpc: '2.0'; id: number; result: T };
type JsonRpcErr = { jsonrpc: '2.0'; id: number; error: { code: number; message: string; data?: unknown } };
type JsonRpcResponse<T> = JsonRpcOk<T> | JsonRpcErr;

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
