declare global {
  interface Window {
    catalyst?: {
      refresh: () => Promise<{ ok: boolean; at: number }>;
      sepoliaStatus: () => Promise<
        | { ok: true; rpcUrl: string; chainId: number; blockNumber: number; at: number }
        | { ok: false; rpcUrl: string; error: string; at: number }
      >;
      hefestosRun: (payload: {
        text: string;
        cycles: number;
        jsonl?: string;
        na: { I: number; E: number; R: number; K: number };
        mele: { M: number; E: number; L: number; Et: number };
        hefestosPath?: string;
      }) => Promise<{ ok: boolean; output: string }>;
    };
  }
}

export {};
