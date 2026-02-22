import { useEffect, useState } from 'react';
import { ValuationService } from '@/services/ValuationService';

type ValuationState = {
  loading: boolean;
  tvpHuman: string;
  raw?: bigint;
  updatedAt?: number;
  error?: string;
};

export function useValuation() {
  const [state, setState] = useState<ValuationState>({ loading: true, tvpHuman: '--' });

  useEffect(() => {
    const rpc = import.meta.env.VITE_RPC_URL as string | undefined;
    const addr = import.meta.env.VITE_VALUATION_LEDGER as string | undefined;

    if (!rpc || !addr) {
      setState({
        loading: false,
        tvpHuman: '--',
        error: 'VITE_RPC_URL or VITE_VALUATION_LEDGER missing'
      });
      return;
    }

    const service = new ValuationService(rpc, addr);

    const load = async () => {
      setState((current) => ({ ...current, loading: true }));
      try {
        const snapshot = await service.loadSnapshot();
        setState({
          loading: false,
          tvpHuman: snapshot.toHuman(),
          raw: snapshot.raw,
          updatedAt: Date.now()
        });
      } catch (e) {
        setState((current) => ({
          ...current,
          loading: false,
          error: (e as Error).message
        }));
      }
    };

    void load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  return state;
}
