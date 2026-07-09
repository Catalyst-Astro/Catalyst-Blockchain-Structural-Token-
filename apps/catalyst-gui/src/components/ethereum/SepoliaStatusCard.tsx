import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Server } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

type Status =
  | { state: 'loading' }
  | { state: 'empty'; message: string }
  | { state: 'error'; rpcUrl: string; message: string; at: number }
  | { state: 'ready'; rpcUrl: string; chainId: number; blockNumber: number; at: number };

function formatAt(at: number): string {
  try {
    return new Date(at).toLocaleString();
  } catch {
    return String(at);
  }
}

const SepoliaStatusCard: React.FC = () => {
  const hasBridge = typeof window !== 'undefined' && !!window.catalyst?.sepoliaStatus;
  const [status, setStatus] = useState<Status>({ state: 'loading' });

  const load = useCallback(async () => {
    if (!hasBridge) {
      setStatus({ state: 'empty', message: 'Electron bridge not available. Run this screen inside the Electron app.' });
      return;
    }

    setStatus({ state: 'loading' });
    const res = await window.catalyst!.sepoliaStatus();
    if (res.ok) {
      setStatus({ state: 'ready', rpcUrl: res.rpcUrl, chainId: res.chainId, blockNumber: res.blockNumber, at: res.at });
      return;
    }
    setStatus({ state: 'error', rpcUrl: res.rpcUrl, message: res.error, at: res.at });
  }, [hasBridge]);

  useEffect(() => {
    void load();
  }, [load]);

  const networkLabel = useMemo(() => {
    if (status.state !== 'ready') return null;
    if (status.chainId === 11155111) return 'Sepolia (11155111)';
    return `Chain ${status.chainId}`;
  }, [status]);

  return (
    <Card>
      <CardHeader className="flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <Server className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <CardTitle>Sepolia connection</CardTitle>
            <CardDescription>Live RPC health check for your GUI.</CardDescription>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={load} disabled={status.state === 'loading'}>
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        {status.state === 'loading' ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-border/25 p-3">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="rounded-md border border-border bg-border/25 p-3">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="rounded-md border border-border bg-border/25 p-3">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        ) : status.state === 'empty' ? (
          <div className="rounded-md border border-border bg-border/25 p-4 text-sm text-muted">{status.message}</div>
        ) : status.state === 'error' ? (
          <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5" aria-hidden />
              <div className="space-y-1">
                <div className="font-semibold">RPC error</div>
                <div className="text-red-700/90 dark:text-red-100/90 break-all">{status.message}</div>
                <div className="text-xs opacity-80 break-all">RPC: {status.rpcUrl}</div>
                <div className="text-xs opacity-80">Checked: {formatAt(status.at)}</div>
              </div>
            </div>
            <div>
              <Button size="sm" variant="primary" onClick={load}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-card p-3">
              <div className="text-xs text-muted">Network</div>
              <div className="mt-1 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden />
                <span>{networkLabel}</span>
              </div>
              <div className="mt-1 text-xs text-muted">Checked: {formatAt(status.at)}</div>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <div className="text-xs text-muted">Latest block</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{status.blockNumber.toLocaleString()}</div>
              <div className="mt-1 text-xs text-muted">Polling is manual (Refresh).</div>
            </div>
            <div className="rounded-md border border-border bg-card p-3">
              <div className="text-xs text-muted">RPC URL</div>
              <div className="mt-1 text-sm font-semibold break-all">{status.rpcUrl}</div>
              <div className="mt-1 text-xs text-muted">Set `SEPOLIA_RPC_URL` to change it.</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SepoliaStatusCard;

