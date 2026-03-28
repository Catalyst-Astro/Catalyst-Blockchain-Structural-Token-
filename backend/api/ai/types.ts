export type ClockchainDomain = "VAL" | "EVT" | "IDC" | "RMP";

export type ClockchainIntent =
  | "release_readiness"
  | "deploy_readiness"
  | "deploy"
  | "create_event"
  | "attest_event"
  | "verify_event"
  | "reject_event"
  | "audit_event"
  | "verify_identity"
  | "issue_credential"
  | "revoke_identity"
  | "revoke_credential"
  | "score_aml"
  | "cash_in_request"
  | "cash_in_confirm"
  | "cash_out_request"
  | "cash_out_confirm"
  | "incident_settlement"
  | "trace_audit";

export type CaseSeverity = "low" | "medium" | "high" | "critical";
export type PolicyClass = "read_only" | "propose_only" | "reversible_execute" | "irreversible_execute";
export type ApprovalState = "not_required" | "pending" | "approved" | "rejected";
export type TaxonomyReversibility = "reversible" | "irreversible";
export type TaxonomyConflictState = "none" | "open" | "blocked";
export type TaxonomyContinuityState = "broken" | "partial" | "complete";
export type RadialCenter = "EP" | "ARCH" | "QA" | "RISK" | "OPS" | "POL";
export type RadialDisposition = "allow" | "restrict" | "observe";
export type ClockchainCaseStatus =
  | "open"
  | "planned"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "completed"
  | "blocked"
  | "failed";
export type CaseRole = "operator" | "approver" | "auditor" | "engineer";
export type ExecutionMode = "dry_run" | "live";
export type CaseStepKind = "trace" | "readiness" | "approval" | "execute" | "audit" | "report";
export type CaseStepStatus = "pending" | "completed" | "failed" | "skipped";

export type TraceContext = {
  traceId?: string;
  reqId?: string;
  ctrId?: string;
  zkRefs?: string[];
  evidenceRefs?: string[];
  eid?: string;
  vids?: string[];
};

export type TaxonomicFactor = {
  domain: ClockchainDomain;
  intent: ClockchainIntent;
  severity: CaseSeverity;
  basePolicyClass: PolicyClass;
  reversibility: TaxonomyReversibility;
  evidenceScore: number;
  conflictState: TaxonomyConflictState;
  continuityState: TaxonomyContinuityState;
  nodeKinds: string[];
  layerFocus: string[];
};

export type RadialVote = {
  center: RadialCenter;
  disposition: RadialDisposition;
  weight: number;
  rationale: string;
};

export type RestrictedRoute = {
  id: string;
  label: string;
  path: string[];
  status: "allowed" | "blocked";
  rationale: string;
};

export type DecisionKernelAssessment = {
  id: string;
  generatedAt: string;
  kernelId: "KRN-001";
  zettelkastenRef: "ZK-KRN-001";
  ntxTraceRef: "TR#KRN-001";
  taxonomy: TaxonomicFactor;
  radialVotes: RadialVote[];
  restrictedRoutes: RestrictedRoute[];
  decision: PolicyClass;
  summary: string;
};

export type CaseStep = {
  id: string;
  label: string;
  kind: CaseStepKind;
  adapter?: string;
  endpoint?: string;
  detail?: string;
  dryRun?: boolean;
  status?: CaseStepStatus;
};

export type CasePlan = {
  caseId: string;
  generatedAt: string;
  dryRunRequired: boolean;
  adapters: string[];
  impact: string;
  preconditions: string[];
  expectedEvidence: string[];
  kernelDirectives: string[];
  rollbackHandoff: string;
  modelExplanation: string;
  steps: CaseStep[];
};

export type ApprovalDecision = "approved" | "rejected";

export type ApprovalRequest = {
  id: string;
  caseId: string;
  action: string;
  justification: string;
  risk: CaseSeverity;
  irreversibleEffects: string[];
  approverRole: CaseRole;
  requestedBy: string;
  requestedAt: string;
  decision: ApprovalDecision;
  decidedAt: string;
  decidedBy: string;
  reason?: string;
};

export type ExecutionStepResult = {
  stepId: string;
  label: string;
  adapter?: string;
  endpoint?: string;
  mode: ExecutionMode;
  status: CaseStepStatus;
  output?: unknown;
  error?: string;
};

export type ExecutionReceipt = {
  id: string;
  caseId: string;
  mode: ExecutionMode;
  startedAt: string;
  completedAt: string;
  status: "completed" | "failed";
  outputRefs: string[];
  errors: string[];
  steps: ExecutionStepResult[];
};

export type CaseReport = {
  id: string;
  caseId: string;
  generatedAt: string;
  summary: string;
  narrative: string;
  traceCoverage: {
    domain: ClockchainDomain;
    traceId?: string;
    coverageRatio?: number;
    releaseGate: "pass" | "fail";
    validationErrors: string[];
    criticalFailures: string[];
  };
  evidence: string[];
  policyDecisions: string[];
  openRisks: string[];
  recommendations: string[];
  timeline: Array<Record<string, unknown>>;
  decisionKernel?: DecisionKernelAssessment;
};

export type ClockchainCase = {
  id: string;
  domain: ClockchainDomain;
  intent: ClockchainIntent;
  severity: CaseSeverity;
  status: ClockchainCaseStatus;
  requester: string;
  requesterRole: CaseRole;
  summary: string;
  input: Record<string, unknown>;
  traceContext: TraceContext;
  policyClass: PolicyClass;
  approvalState: ApprovalState;
  createdAt: string;
  updatedAt: string;
  version: number;
  modelPacket: Record<string, unknown>;
  modelExplanation: string;
  decisionKernel?: DecisionKernelAssessment;
  plan?: CasePlan;
  approvals?: ApprovalRequest[];
  receipts?: ExecutionReceipt[];
  report?: CaseReport;
};

export type CreateCaseInput = {
  requester: string;
  requesterRole?: CaseRole;
  summary: string;
  input?: Record<string, unknown>;
  domain?: ClockchainDomain;
  intent?: ClockchainIntent;
  severity?: CaseSeverity;
  traceContext?: TraceContext;
};

export type ApproveCaseInput = {
  decidedBy: string;
  requester?: string;
  decision: ApprovalDecision;
  reason?: string;
};

export type ExecuteCaseInput = {
  requestedBy?: string;
  mode?: ExecutionMode;
};

export type ResolvedTrace = {
  traceId?: string;
  domain: ClockchainDomain;
  reqId?: string;
  ctrId?: string;
  zkRefs: string[];
  evidenceRefs: string[];
  artifacts: string[];
  tests: string[];
  metrics: string[];
  notes: Array<{
    id: string;
    kind: string;
    layer: string;
    artifactRefs: string[];
    testRefs: string[];
    metricRefs: string[];
    evidenceRefs: string[];
    conflicts: string[];
  }>;
  nodesByStage: Record<string, string[]>;
  candidateTraces: string[];
};

export const CLOCKCHAIN_DOMAINS: ClockchainDomain[] = ["VAL", "EVT", "IDC", "RMP"];
