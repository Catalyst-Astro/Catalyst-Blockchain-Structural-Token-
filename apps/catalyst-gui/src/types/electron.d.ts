declare global {
  interface Window {
    catalyst?: {
      refresh: () => Promise<{ ok: boolean; at: number }>;
    };
  }
}

export {};
