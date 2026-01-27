declare global {
  interface Window {
    catalyst?: {
      refresh: () => Promise<{ ok: boolean; at: number }>;
      sepoliaStatus: () => Promise<
        | { ok: true; rpcUrl: string; chainId: number; blockNumber: number; at: number }
        | { ok: false; rpcUrl: string; error: string; at: number }
      >;
    };
  }
}

export {};
