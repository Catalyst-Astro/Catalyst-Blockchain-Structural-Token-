import { contextBridge, ipcRenderer } from 'electron';

type RefreshResponse = { ok: boolean; at: number };

const api = {
  refresh: (): Promise<RefreshResponse> => ipcRenderer.invoke('refresh')
};

contextBridge.exposeInMainWorld('catalyst', api);

declare global {
  interface Window {
    catalyst?: typeof api;
  }
}
