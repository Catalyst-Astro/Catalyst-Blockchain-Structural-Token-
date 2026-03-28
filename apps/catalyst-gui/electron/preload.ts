import { contextBridge, ipcRenderer } from 'electron';

type RefreshResponse = { ok: boolean; at: number };
type SepoliaStatusResponse =
  | { ok: true; rpcUrl: string; chainId: number; blockNumber: number; at: number }
  | { ok: false; rpcUrl: string; error: string; at: number };

const api = {
  refresh: (): Promise<RefreshResponse> => ipcRenderer.invoke('refresh'),
  sepoliaStatus: (): Promise<SepoliaStatusResponse> => ipcRenderer.invoke('sepolia:status'),
  operationsList: () => ipcRenderer.invoke('operations:list'),
  operationsCreate: (input: unknown) => ipcRenderer.invoke('operations:create', input),
  notificationsGet: () => ipcRenderer.invoke('notifications:get'),
  notificationsUpdate: (patch: unknown) => ipcRenderer.invoke('notifications:update', patch),
  aiCasesList: () => ipcRenderer.invoke('ai:cases:list'),
  aiCaseCreate: (input: unknown) => ipcRenderer.invoke('ai:cases:create', input),
  aiCasePlan: (caseId: string) => ipcRenderer.invoke('ai:cases:plan', caseId),
  aiCaseApprove: (caseId: string, input: unknown) => ipcRenderer.invoke('ai:cases:approve', caseId, input),
  aiCaseExecute: (caseId: string, input: unknown) => ipcRenderer.invoke('ai:cases:execute', caseId, input),
  aiCaseReport: (caseId: string) => ipcRenderer.invoke('ai:cases:report', caseId),
  aiReleaseReadiness: (domain?: string) => ipcRenderer.invoke('ai:release:readiness', domain),
  uiCasesList: () => ipcRenderer.invoke('ui:cases:list'),
  uiCaseCreate: (input: unknown) => ipcRenderer.invoke('ui:cases:create', input),
  uiCasePlan: (caseId: string) => ipcRenderer.invoke('ui:cases:plan', caseId),
  uiCaseReport: (caseId: string) => ipcRenderer.invoke('ui:cases:report', caseId)
};

contextBridge.exposeInMainWorld('catalyst', api);

declare global {
  interface Window {
    catalyst?: typeof api;
  }
}
