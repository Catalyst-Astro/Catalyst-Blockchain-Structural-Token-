import React, { useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, PlayCircle, ShieldCheck } from 'lucide-react';

import Button from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

type ViewState = 'ready' | 'loading' | 'empty' | 'error';

const decisionTone: Record<OperatorDecisionKernel['decision'], string> = {
  read_only: 'border-slate-400/40 bg-slate-500/10 text-slate-700 dark:text-slate-200',
  propose_only: 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  reversible_execute: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  irreversible_execute: 'border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-200'
};

const radialTone: Record<OperatorRadialDisposition, string> = {
  allow: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  restrict: 'border-rose-400/40 bg-rose-500/10 text-rose-700 dark:text-rose-200',
  observe: 'border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-200'
};

const intentsByDomain: Record<OperatorDomain, { value: string; label: string }[]> = {
  VAL: [
    { value: 'release_readiness', label: 'Release readiness' },
    { value: 'deploy_readiness', label: 'Deploy readiness' },
    { value: 'deploy', label: 'Deploy value engine' }
  ],
  EVT: [
    { value: 'create_event', label: 'Create event' },
    { value: 'attest_event', label: 'Attest event' },
    { value: 'verify_event', label: 'Verify event' },
    { value: 'reject_event', label: 'Reject event' }
  ],
  IDC: [
    { value: 'verify_identity', label: 'Verify identity' },
    { value: 'issue_credential', label: 'Issue credential' },
    { value: 'revoke_identity', label: 'Revoke identity' },
    { value: 'revoke_credential', label: 'Revoke credential' },
    { value: 'score_aml', label: 'Score AML' }
  ],
  RMP: [
    { value: 'cash_in_request', label: 'Cash-in request' },
    { value: 'cash_in_confirm', label: 'Cash-in confirm' },
    { value: 'cash_out_request', label: 'Cash-out request' },
    { value: 'cash_out_confirm', label: 'Cash-out confirm' },
    { value: 'incident_settlement', label: 'Settlement incident' }
  ]
};

interface OperatorInboxProps {
  viewState: ViewState;
  cases: OperatorCaseRecord[];
  readiness: ReleaseReadiness | null;
  report: OperatorCaseRecord['report'] | null;
  selectedCaseId?: string;
  onSelectCase: (caseId: string) => void;
  onRefresh: () => void;
  onCreateCase: (input: { requester: string; domain: OperatorDomain; intent: string; summary: string }) => void;
  onPlanCase: (caseId: string) => void;
  onApproveCase: (caseId: string) => void;
  onExecuteCase: (caseId: string, mode: OperatorExecutionMode) => void;
}

const OperatorInbox: React.FC<OperatorInboxProps> = ({
  viewState,
  cases,
  readiness,
  report,
  selectedCaseId,
  onSelectCase,
  onRefresh,
  onCreateCase,
  onPlanCase,
  onApproveCase,
  onExecuteCase
}) => {
  const [requester, setRequester] = useState('ops-desk');
  const [domain, setDomain] = useState<OperatorDomain>('IDC');
  const [intent, setIntent] = useState('verify_identity');
  const [summary, setSummary] = useState('Verify investor identity and open the traceable case.');

  const selectedCase = useMemo(
    () => cases.find((entry) => entry.id === selectedCaseId) ?? cases[0] ?? null,
    [cases, selectedCaseId]
  );
  const pendingApprovals = useMemo(
    () => cases.filter((entry) => entry.approvalState === 'pending').length,
    [cases]
  );
  const readyCases = useMemo(
    () => cases.filter((entry) => entry.status === 'planned' || entry.status === 'approved').length,
    [cases]
  );

  const submitCase = () => {
    onCreateCase({ requester, domain, intent, summary });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-r from-primary/20 via-card to-card">
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Managed operator
            </p>
            <CardTitle className="text-2xl">Clockchain Operator AI</CardTitle>
            <CardDescription className="max-w-2xl text-sm">
              Casos gobernados por traza ZK/NTX, dry-run obligatorio y aprobación humana cuando aplica AX12.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending approvals</CardTitle>
            <CardDescription>Casos esperando autorización humana.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{pendingApprovals}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution ready</CardTitle>
            <CardDescription>Casos listos para ejecutar en dry-run/live.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{readyCases}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Release gate</CardTitle>
            <CardDescription>Estado global del release clockchain.</CardDescription>
          </CardHeader>
          <CardContent className={readiness?.releaseGate === 'pass' ? 'text-emerald-600 text-3xl font-semibold' : 'text-red-600 text-3xl font-semibold'}>
            {readiness?.releaseGate?.toUpperCase() || '--'}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Open case</CardTitle>
            <CardDescription>Crear caso tipado para la mesa de operación/compliance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input aria-label="Requester" value={requester} onChange={(event) => setRequester(event.target.value)} placeholder="ops-desk" />
            <Select
              aria-label="Domain"
              value={domain}
              onChange={(event) => {
                const nextDomain = event.target.value as OperatorDomain;
                setDomain(nextDomain);
                setIntent(intentsByDomain[nextDomain][0].value);
              }}
            >
              {Object.keys(intentsByDomain).map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
            <Select aria-label="Intent" value={intent} onChange={(event) => setIntent(event.target.value)}>
              {intentsByDomain[domain].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input aria-label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Describe the operator case" />
            <Button onClick={submitCase} size="sm">
              Create case
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval inbox</CardTitle>
            <CardDescription>Selecciona un caso para planear, aprobar o ejecutar.</CardDescription>
          </CardHeader>
          <CardContent>
            {viewState === 'loading' ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : viewState === 'error' ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
                Unable to reach the operator backend. Start the API or set `CATALYST_API_URL`.
              </div>
            ) : cases.length === 0 ? (
              <div className="rounded-md bg-border/40 p-4 text-sm text-muted">No operator cases yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((entry) => (
                    <TableRow key={entry.id} tabIndex={0} className={entry.id === selectedCase?.id ? 'bg-border/30' : ''} onClick={() => onSelectCase(entry.id)}>
                      <TableCell className="font-semibold">{entry.domain}</TableCell>
                      <TableCell>{entry.intent}</TableCell>
                      <TableCell>{entry.status}</TableCell>
                      <TableCell>{entry.approvalState}</TableCell>
                      <TableCell className="text-right text-muted">{new Date(entry.updatedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Case detail</CardTitle>
            <CardDescription>Trace, approvals, and execution actions for the selected case.</CardDescription>
          </div>
          {selectedCase ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => onPlanCase(selectedCase.id)} iconLeft={<ClipboardList className="h-4 w-4" aria-hidden />}>
                Plan
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onApproveCase(selectedCase.id)} disabled={selectedCase.approvalState !== 'pending'}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onExecuteCase(selectedCase.id, 'dry_run')} iconLeft={<PlayCircle className="h-4 w-4" aria-hidden />}>
                Dry run
              </Button>
              <Button size="sm" onClick={() => onExecuteCase(selectedCase.id, 'live')} disabled={selectedCase.approvalState === 'pending'}>
                Execute live
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {!selectedCase ? (
            <div className="rounded-md bg-border/40 p-4 text-sm text-muted">Pick a case from the inbox to inspect it.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
              <div className="space-y-3 rounded-lg border border-border/80 bg-card/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Case</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">ID:</span> {selectedCase.id}</p>
                  <p><span className="font-semibold">Requester:</span> {selectedCase.requester}</p>
                  <p><span className="font-semibold">Trace:</span> {selectedCase.traceContext?.traceId || '--'}</p>
                  <p><span className="font-semibold">REQ/CTR:</span> {selectedCase.traceContext?.reqId || '--'} / {selectedCase.traceContext?.ctrId || '--'}</p>
                  <p><span className="font-semibold">Severity:</span> {selectedCase.severity}</p>
                </div>
                {selectedCase.decisionKernel ? (
                  <div className="rounded-md bg-border/40 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">Decision kernel</p>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${decisionTone[selectedCase.decisionKernel.decision]}`}>
                        {selectedCase.decisionKernel.decision}
                      </span>
                    </div>
                    <p className="mt-2 text-muted">{selectedCase.decisionKernel.summary}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p><span className="font-semibold">Kernel refs:</span> {selectedCase.decisionKernel.zettelkastenRef} / {selectedCase.decisionKernel.ntxTraceRef}</p>
                      <p><span className="font-semibold">Evidence score:</span> {selectedCase.decisionKernel.taxonomy.evidenceScore}</p>
                      <p><span className="font-semibold">Continuity:</span> {selectedCase.decisionKernel.taxonomy.continuityState}</p>
                      <p><span className="font-semibold">Conflict:</span> {selectedCase.decisionKernel.taxonomy.conflictState}</p>
                    </div>
                    <div className="mt-3">
                      <p className="font-semibold">Radial centers</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedCase.decisionKernel.radialVotes.map((vote) => (
                          <span
                            key={vote.center}
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${radialTone[vote.disposition]}`}
                            title={vote.rationale}
                          >
                            {vote.center}: {vote.disposition}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="font-semibold">Restricted routes</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {selectedCase.decisionKernel.restrictedRoutes.map((route) => (
                          <li key={route.id}>
                            {route.label}: {route.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
                <div className="rounded-md bg-border/40 p-3 text-sm">
                  <p className="font-semibold">Plan steps</p>
                  {selectedCase.plan?.steps?.length ? (
                    <ul className="mt-2 space-y-1 text-muted">
                      {selectedCase.plan.steps.map((step) => (
                        <li key={step.id}>{step.label}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-muted">Generate a plan to see the controlled execution path.</p>
                  )}
                  {selectedCase.plan?.kernelDirectives?.length ? (
                    <div className="mt-3 border-t border-border/80 pt-3">
                      <p className="font-semibold">Kernel directives</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {selectedCase.plan.kernelDirectives.map((directive) => (
                          <li key={directive}>{directive}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/80 bg-card/60 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" aria-hidden />
                  <p className="font-semibold">Auditable report</p>
                </div>
                {report ? (
                  <div className="space-y-3 text-sm">
                    <p>{report.summary}</p>
                    <p className="text-muted">{report.narrative}</p>
                    {report.decisionKernel ? (
                      <div>
                        <p className="font-semibold">Kernel report</p>
                        <p className="mt-2 text-muted">{report.decisionKernel.summary}</p>
                        <ul className="mt-2 space-y-1 text-muted">
                          {report.decisionKernel.restrictedRoutes.map((route) => (
                            <li key={route.id}>
                              {route.label}: {route.status}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div>
                      <p className="font-semibold">Recommendations</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {report.recommendations.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Open risks</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {(report.openRisks.length > 0 ? report.openRisks : ['No open risks']).map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Run plan/report actions to populate the audit narrative.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OperatorInbox;
