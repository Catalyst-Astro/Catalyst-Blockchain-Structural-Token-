import React, { useMemo, useState } from "react";
import { Compass, Eye, Palette, ScanLine } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import WebForgeBoard from "@/components/forge/WebForgeBoard";

type ViewState = "ready" | "loading" | "empty" | "error";

const intentsBySurface: Record<UiSurface, { value: UiCopilotIntent; label: string }[]> = {
  dashboard: [
    { value: "surface_review", label: "Surface review" },
    { value: "layout_proposal", label: "Layout proposal" },
    { value: "design_regression", label: "Design regression" },
  ],
  operator: [
    { value: "surface_review", label: "Surface review" },
    { value: "a11y_audit", label: "A11y audit" },
    { value: "component_brief", label: "Component brief" },
  ],
  settings: [
    { value: "surface_review", label: "Surface review" },
    { value: "component_brief", label: "Component brief" },
    { value: "a11y_audit", label: "A11y audit" },
  ],
};

interface UiLabProps {
  viewState: ViewState;
  cases: UiCopilotCase[];
  report: UiReviewReport | null;
  selectedCaseId?: string;
  onSelectCase: (caseId: string) => void;
  onRefresh: () => void;
  onCreateCase: (input: { requester: string; surface: UiSurface; intent: UiCopilotIntent; summary: string }) => void;
  onPlanCase: (caseId: string) => void;
  onReportCase: (caseId: string) => void;
}

const UiLab: React.FC<UiLabProps> = ({
  viewState,
  cases,
  report,
  selectedCaseId,
  onSelectCase,
  onRefresh,
  onCreateCase,
  onPlanCase,
  onReportCase,
}) => {
  const [requester, setRequester] = useState("design-ops");
  const [surface, setSurface] = useState<UiSurface>("dashboard");
  const [intent, setIntent] = useState<UiCopilotIntent>("surface_review");
  const [summary, setSummary] = useState("Review the dashboard surface and keep the ZK/NTX contract explicit.");

  const selectedCase = useMemo(
    () => cases.find((entry) => entry.id === selectedCaseId) ?? cases[0] ?? null,
    [cases, selectedCaseId]
  );
  const plannedCases = useMemo(() => cases.filter((entry) => entry.status === "planned" || entry.status === "reviewed").length, [cases]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-r from-primary/15 via-card to-card">
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              <Palette className="h-3.5 w-3.5" aria-hidden />
              UI copilot
            </p>
            <CardTitle className="text-2xl">UI Lab</CardTitle>
            <CardDescription className="max-w-2xl text-sm">
              Governed UI proposals for Dashboard, Operator, and Settings, all anchored to `ZK-GUI-001` and `TR#GUI-001`.
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </CardHeader>
      </Card>

      <WebForgeBoard onSeedCase={onCreateCase} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open reviews</CardTitle>
            <CardDescription>UI cases currently under review or planning.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{cases.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planned surfaces</CardTitle>
            <CardDescription>Cases with proposal or review artifacts already generated.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{plannedCases}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trace anchor</CardTitle>
            <CardDescription>Initial GUI Zettelkasten domain.</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-semibold">ZK-GUI-001 / TR#GUI-001</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Open UI case</CardTitle>
            <CardDescription>Create a governed UI proposal with fixed surface and intent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input aria-label="Requester" value={requester} onChange={(event) => setRequester(event.target.value)} placeholder="design-ops" />
            <Select
              aria-label="Surface"
              value={surface}
              onChange={(event) => {
                const nextSurface = event.target.value as UiSurface;
                setSurface(nextSurface);
                setIntent(intentsBySurface[nextSurface][0].value);
              }}
            >
              {Object.keys(intentsBySurface).map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
            <Select aria-label="Intent" value={intent} onChange={(event) => setIntent(event.target.value as UiCopilotIntent)}>
              {intentsBySurface[surface].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input aria-label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Describe the UI review" />
            <Button size="sm" onClick={() => onCreateCase({ requester, surface, intent, summary })}>
              Create UI case
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review queue</CardTitle>
            <CardDescription>Current UI proposals and their Zettelkasten state.</CardDescription>
          </CardHeader>
          <CardContent>
            {viewState === "loading" ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : viewState === "error" ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
                Unable to reach the UI copilot backend.
              </div>
            ) : cases.length === 0 ? (
              <div className="rounded-md bg-border/40 p-4 text-sm text-muted">No UI review cases yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surface</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((entry) => (
                    <TableRow key={entry.id} tabIndex={0} className={entry.id === selectedCase?.id ? "bg-border/30" : ""} onClick={() => onSelectCase(entry.id)}>
                      <TableCell className="font-semibold">{entry.surface}</TableCell>
                      <TableCell>{entry.intent}</TableCell>
                      <TableCell>{entry.status}</TableCell>
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
            <CardDescription>Proposal, acceptance criteria, and captured UI evidence.</CardDescription>
          </div>
          {selectedCase ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => onPlanCase(selectedCase.id)}>
                Plan
              </Button>
              <Button size="sm" onClick={() => onReportCase(selectedCase.id)}>
                Build report
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {!selectedCase ? (
            <div className="rounded-md bg-border/40 p-4 text-sm text-muted">Pick a UI case to inspect the governed proposal.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
              <div className="space-y-3 rounded-lg border border-border/80 bg-card/60 p-4">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" aria-hidden />
                  <p className="font-semibold">Proposal</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Trace:</span> {selectedCase.traceId || "--"}</p>
                  <p><span className="font-semibold">ZK refs:</span> {(selectedCase.zkRefs || []).join(", ") || "--"}</p>
                </div>
                {selectedCase.proposal ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold">Tokens</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {selectedCase.proposal.tokens.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Layout changes</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {selectedCase.proposal.layoutChanges.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Accessibility checks</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {selectedCase.proposal.a11yChecks.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Generate a plan to materialize the UI proposal.</p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-border/80 bg-card/60 p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" aria-hidden />
                  <p className="font-semibold">Review report</p>
                </div>
                {report ? (
                  <div className="space-y-3 text-sm">
                    <p>{report.summary}</p>
                    <div>
                      <p className="font-semibold">Recommendations</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {report.recommendations.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Regressions</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {(report.regressions.length > 0 ? report.regressions : ["No active regressions"]).map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold">Evidence refs</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        {report.evidenceRefs.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Build the report to capture evidence and screenshot refs.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UiLab;
