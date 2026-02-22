import { contextBridge, ipcRenderer } from 'electron';

type RefreshResponse = { ok: boolean; at: number };
type SepoliaStatusResponse =
  | { ok: true; rpcUrl: string; chainId: number; blockNumber: number; at: number }
  | { ok: false; rpcUrl: string; error: string; at: number };
type OperationStatus = 'active' | 'pending' | 'blocked';
type RiskLevel = 'low' | 'medium' | 'high';
type OperationRecord = {
  id: string;
  name: string;
  owner: string;
  status: OperationStatus;
  updatedAt: string;
  risk: RiskLevel;
};
type OperationListResponse = { ok: true; operations: OperationRecord[] };
type OperationCreateResponse = { ok: true; operation: OperationRecord; operations: OperationRecord[] };
type NotificationSettings = {
  emailEnabled: boolean;
  slackEnabled: boolean;
  slackWebhookUrl: string;
};
type NotificationGetResponse = { ok: true; notifications: NotificationSettings };
type NotificationUpdateResponse = { ok: true; notifications: NotificationSettings };

const api = {
  refresh: (): Promise<RefreshResponse> => ipcRenderer.invoke('refresh'),
  sepoliaStatus: (): Promise<SepoliaStatusResponse> => ipcRenderer.invoke('sepolia:status'),
  operationsList: (): Promise<OperationListResponse> => ipcRenderer.invoke('operations:list'),
  operationsCreate: (payload: Partial<OperationRecord>): Promise<OperationCreateResponse> =>
    ipcRenderer.invoke('operations:create', payload),
  notificationsGet: (): Promise<NotificationGetResponse> => ipcRenderer.invoke('notifications:get'),
  notificationsUpdate: (payload: Partial<NotificationSettings>): Promise<NotificationUpdateResponse> =>
    ipcRenderer.invoke('notifications:update', payload)
};

contextBridge.exposeInMainWorld('catalyst', api);

declare global {
  interface Window {
    catalyst?: typeof api;
  }
}
