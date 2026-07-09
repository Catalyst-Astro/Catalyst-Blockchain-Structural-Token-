import React, { useMemo } from 'react';
import { AlertTriangle, Radar, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Toast from '../components/ui/Toast';
import SepoliaStatusCard from '@/components/ethereum/SepoliaStatusCard';
import KpiTile from '@/components/dashboard/KpiTile';
import RiskMeter from '@/components/dashboard/RiskMeter';
import StatusPill from '@/components/dashboard/StatusPill';
import { useValuation } from '@/hooks/useValuation';
import { OperationPortfolio } from '@/domain/operations/OperationPortfolio';
import type { OperationRecordProps } from '@/domain/operations/OperationRecord';

export type ViewState = 'ready' | 'loading' | 'empty' | 'error';

interface DashboardProps {
  viewState: ViewState;
  onRetry: () => void;
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  operations: OperationRecordProps[];
  onCreateOperation: () => void;
  toastMessage?: string;
  showToast?: boolean;
}

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active only' },
  { value: 'pending', label: 'Pending only' },
  { value: 'blocked', label: 'Blocked only' }
];

const riskTextByLevel = {
  low: 'text-emerald-600 dark:text-emerald-300',
  medium: 'text-amber-600 dark:text-amber-300',
  high: 'text-red-600 dark:text-red-300'
};

const Dashboard: React.FC<DashboardProps> = ({
  viewState,
  onRetry,
  search,
  status,
  onSearch,
  onStatus,
  operations,
  onCreateOperation,
  toastMessage,
  showToast
}) => {
  const valuation = useValuation();
  const portfolio = useMemo(() => OperationPortfolio.fromSeed(operations), [operations]);
  const metrics = useMemo(() => portfolio.metrics, [portfolio]);
  const filteredRows = useMemo(() => portfolio.filter(search, status), [portfolio, search, status]);
  const criticalRecord = useMemo(() => portfolio.mostCritical, [portfolio]);

  const showEmpty = viewState === 'empty' || filteredRows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-r from-primary/20 via-card to-card">
        <CardHeader className="items-start gap-4 md:flex-row md:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Clockchain command center
            </p>
            <CardTitle className="text-2xl">Operational pulse and inference control</CardTitle>
            <CardDescription className="max-w-2xl text-sm">
              Antropia projects the operating architecture; Apoiesis keeps trace continuity from requirement to runtime.
            </CardDescription>
          </div>
          <div className="w-full rounded-lg border border-border/80 bg-card/80 p-3 md:w-[280px]">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Radar className="h-4 w-4 text-primary" aria-hidden />
              <span>Critical focus</span>
            </div>
            {criticalRecord ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{criticalRecord.name}</p>
                <p className="text-muted">Owner: {criticalRecord.owner}</p>
                <p className={`${riskTextByLevel[criticalRecord.risk]} font-semibold`}>Risk: {criticalRecord.riskLabel}</p>
              </div>
            ) : (
              <p className="text-sm text-muted">No critical operation identified.</p>
            )}
            <div className="mt-3">
              <RiskMeter value={metrics.riskIndex} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <SepoliaStatusCard />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {viewState === 'loading' ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="p-4">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-9 w-28" />
              <Skeleton className="mt-2 h-4 w-36" />
            </Card>
          ))
        ) : (
          <>
            <KpiTile label="Portfolio value" value={valuation.tvpHuman} helper="24h valuation throughput" trend="up" />
            <KpiTile
              label="Operations online"
              value={`${metrics.active}/${metrics.total}`}
              helper={`${metrics.pending} pending approvals`}
              trend={metrics.pending > 0 ? 'flat' : 'up'}
            />
            <KpiTile
              label="Blocked flows"
              value={String(metrics.blocked)}
              helper={metrics.blocked > 0 ? 'Requires escalation review' : 'No blocked entries'}
              trend={metrics.blocked > 0 ? 'down' : 'up'}
            />
            <KpiTile
              label="Freshness index"
              value={`${metrics.freshnessIndex}%`}
              helper="Signal recency and update cadence"
              trend={metrics.freshnessIndex >= 70 ? 'up' : 'flat'}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Operations ledger</CardTitle>
            <CardDescription>Traceable operations filtered by status and search.</CardDescription>
          </div>
          <div className="flex w-full flex-wrap gap-2 md:w-auto">
            <div className="min-w-[220px] flex-1">
              <Input
                aria-label="Search operations"
                placeholder="Search operations"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
            <div className="w-[180px]">
              <Select aria-label="Filter by status" value={status} onChange={(e) => onStatus(e.target.value)}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewState === 'loading' ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : viewState === 'error' ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/30">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-200">
                <AlertTriangle className="h-5 w-5" aria-hidden />
                <span>Unable to load operational ledger.</span>
              </div>
              <Button variant="primary" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : showEmpty ? (
            <div className="rounded-md bg-border/40 p-4">
              <h4 className="text-lg font-semibold">No matching records</h4>
              <p className="mt-1 text-sm text-muted">Adjust filters or onboard a new operation to populate this table.</p>
              <Button size="sm" variant="primary" className="mt-3" onClick={onCreateOperation}>
                Create operation
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={`${row.name}-${row.updatedAt}`} tabIndex={0}>
                    <TableCell className="font-semibold">{row.name}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>
                      <StatusPill status={row.status} />
                    </TableCell>
                    <TableCell className={riskTextByLevel[row.risk]}>{row.riskLabel}</TableCell>
                    <TableCell className="text-right text-muted">{row.updatedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Toast message={toastMessage || 'View refreshed'} tone="info" show={!!showToast} />
    </div>
  );
};

export default Dashboard;
