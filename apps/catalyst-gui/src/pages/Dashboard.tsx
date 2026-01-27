import React from 'react';
import { ShieldCheck, Zap, Building2, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Toast from '../components/ui/Toast';

export type ViewState = 'ready' | 'loading' | 'empty' | 'error';

interface DashboardProps {
  viewState: ViewState;
  onStateChange: (state: ViewState) => void;
  onRetry: () => void;
  search: string;
  status: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  toastMessage?: string;
  showToast?: boolean;
}

const metrics = [
  { label: 'Verified identities', value: '1,284', helper: '+3.2% vs last week', icon: ShieldCheck },
  { label: 'Active events', value: '86', helper: '12 awaiting verification', icon: Building2 },
  { label: 'Ramp throughput', value: '$2.4M', helper: '24h settlement volume', icon: Zap }
];

const rows = [
  { name: 'Fractal Phase II', owner: 'Catalyst Ops', status: 'active', updated: '2026-01-26', risk: 'Low' },
  { name: 'Notary Cycle 14', owner: 'Compliance', status: 'pending', updated: '2026-01-25', risk: 'Medium' },
  { name: 'Ramp Mexico', owner: 'Treasury', status: 'active', updated: '2026-01-24', risk: 'Low' },
  { name: 'Audit Q1', owner: 'Audit Guild', status: 'blocked', updated: '2026-01-23', risk: 'High' }
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'blocked', label: 'Blocked' }
];

const Dashboard: React.FC<DashboardProps> = ({
  viewState,
  onStateChange,
  onRetry,
  search,
  status,
  onSearch,
  onStatus,
  toastMessage,
  showToast
}) => {
  const filteredRows = rows.filter((row) => {
    const matchesStatus = status === 'all' || row.status === status;
    const matchesSearch = row.name.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const showEmpty = viewState === 'empty' || filteredRows.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2" aria-label="State toggles">
          {(['ready', 'loading', 'empty', 'error'] as ViewState[]).map((state) => (
            <Button
              key={state}
              size="sm"
              variant={viewState === state ? 'primary' : 'secondary'}
              onClick={() => onStateChange(state)}
              aria-pressed={viewState === state}
            >
              {state}
            </Button>
          ))}
        </div>
        <div className="text-xs text-muted">Simula estados para QA: ready / loading / empty / error</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {viewState === 'loading'
          ? metrics.map((metric) => (
              <Card key={metric.label} className="p-4">
                <Skeleton className="h-6 w-24 mb-3" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-4 w-20 mt-2" />
              </Card>
            ))
          : metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label} className="p-5">
                  <CardHeader className="items-start">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <CardTitle className="text-[15px]">{metric.label}</CardTitle>
                        <CardDescription className="text-[13px]">{metric.helper}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold leading-tight tracking-tight">{metric.value}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Card>
        <CardHeader className="flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle>Operations overview</CardTitle>
            <CardDescription>Identity, events, and ramp activity across Catalyst.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="flex-1 min-w-[200px]">
              <Input
                aria-label="Search projects"
                placeholder="Search operations"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
            <div className="w-[160px]">
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
              {Array.from({ length: 4 }).map((_, idx) => (
                <Skeleton key={idx} className="h-10 w-full" />
              ))}
            </div>
          ) : viewState === 'error' ? (
            <div className="flex flex-col items-start gap-3 p-4 bg-red-50 dark:bg-red-900/40 rounded-md border border-red-200 dark:border-red-700">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-200">
                <AlertTriangle className="h-5 w-5" aria-hidden />
                <span>We could not load the operations feed.</span>
              </div>
              <Button variant="primary" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : showEmpty ? (
            <div className="flex flex-col items-start gap-3 p-4 bg-border/40 rounded-md">
              <h4 className="text-lg font-semibold">No records yet</h4>
              <p className="text-sm text-muted">Connect a Fractal project or onboard a notary to see activity.</p>
              <Button size="sm" variant="primary">Create first record</Button>
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
                  <TableRow key={row.name} tabIndex={0}>
                    <TableCell className="font-semibold">{row.name}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ' +
                          (row.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                            : row.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-100'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200')
                        }
                      >
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell>{row.risk}</TableCell>
                    <TableCell className="text-right text-muted">{row.updated}</TableCell>
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
