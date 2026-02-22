declare global {
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
  type NotificationSettings = {
    emailEnabled: boolean;
    slackEnabled: boolean;
    slackWebhookUrl: string;
  };

  interface Window {
    catalyst?: {
      refresh: () => Promise<{ ok: boolean; at: number }>;
      sepoliaStatus: () => Promise<
        | { ok: true; rpcUrl: string; chainId: number; blockNumber: number; at: number }
        | { ok: false; rpcUrl: string; error: string; at: number }
      >;
      operationsList: () => Promise<{ ok: true; operations: OperationRecord[] }>;
      operationsCreate: (payload: Partial<OperationRecord>) => Promise<{ ok: true; operation: OperationRecord; operations: OperationRecord[] }>;
      notificationsGet: () => Promise<{ ok: true; notifications: NotificationSettings }>;
      notificationsUpdate: (payload: Partial<NotificationSettings>) => Promise<{ ok: true; notifications: NotificationSettings }>;
    };
  }
}

export {};
