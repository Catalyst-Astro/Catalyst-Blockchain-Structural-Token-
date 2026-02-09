import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { spawn } from 'node:child_process';

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

ipcMain.handle('hefestos:run', async (_evt, payload: {
  text?: string;
  cycles?: number;
  jsonl?: string;
  na?: { I?: number; E?: number; R?: number; K?: number };
  mele?: { M?: number; E?: number; L?: number; Et?: number };
  hefestosPath?: string;
}) => {
  const {
    text,
    cycles,
    jsonl,
    na,
    mele,
    hefestosPath
  } = payload ?? {};

  const bin = hefestosPath || path.resolve(__dirname, '../../core/build/hefestos');
  const args: string[] = [
    'run',
    '--text', text ?? '',
    '--cycles', String(cycles ?? 1)
  ];

  if (jsonl) args.push('--jsonl', String(jsonl));
  if (na) {
    args.push('--na-I', String(na.I ?? 1));
    args.push('--na-E', String(na.E ?? 1));
    args.push('--na-R', String(na.R ?? 2));
    args.push('--na-K', String(na.K ?? 2));
  }
  if (mele) {
    args.push('--m-M', String(mele.M ?? 4));
    args.push('--m-E', String(mele.E ?? 3));
    args.push('--m-L', String(mele.L ?? 4));
    args.push('--m-Et', String(mele.Et ?? 5));
  }

  const output = await new Promise<string>((resolve, reject) => {
    const proc = spawn(bin, args, { shell: false });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`hefestos exited ${code}: ${stderr || stdout}`));
    });
  });

  return { ok: true, output };
});
