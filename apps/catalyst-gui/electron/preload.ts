import { contextBridge, ipcRenderer } from 'electron';

type RefreshResponse = { ok: boolean; at: number };
type SepoliaStatusResponse =
  | { ok: true; rpcUrl: string; chainId: number; blockNumber: number; at: number }
  | { ok: false; rpcUrl: string; error: string; at: number };

const api = {
  refresh: (): Promise<RefreshResponse> => ipcRenderer.invoke('refresh'),
  sepoliaStatus: (): Promise<SepoliaStatusResponse> => ipcRenderer.invoke('sepolia:status')
};

contextBridge.exposeInMainWorld('catalyst', api);

declare global {
  interface Window {
    catalyst?: typeof api;
  }
}
