import { contextBridge, ipcRenderer } from 'electron';

type RefreshResponse = { ok: boolean; at: number };
type SepoliaStatusResponse =
  | { ok: true; rpcUrl: string; chainId: number; blockNumber: number; at: number }
  | { ok: false; rpcUrl: string; error: string; at: number };
type HefestosRunResponse = { ok: boolean; output: string };
type HefestosRunRequest = {
  text: string;
  cycles: number;
  jsonl?: string;
  na: { I: number; E: number; R: number; K: number };
  mele: { M: number; E: number; L: number; Et: number };
  hefestosPath?: string;
};

const api = {
  refresh: (): Promise<RefreshResponse> => ipcRenderer.invoke('refresh'),
  sepoliaStatus: (): Promise<SepoliaStatusResponse> => ipcRenderer.invoke('sepolia:status'),
  hefestosRun: (payload: HefestosRunRequest): Promise<HefestosRunResponse> => ipcRenderer.invoke('hefestos:run', payload)
};

contextBridge.exposeInMainWorld('catalyst', api);

declare global {
  interface Window {
    catalyst?: typeof api;
  }
}
