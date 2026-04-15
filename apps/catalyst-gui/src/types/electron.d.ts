declare global {
  type OperationStatus = 'active' | 'pending' | 'blocked';
  type RiskLevel = 'low' | 'medium' | 'high';
  type OperatorDomain = 'VAL' | 'EVT' | 'IDC' | 'RMP';
  type OperatorSeverity = 'low' | 'medium' | 'high' | 'critical';
  type OperatorCaseStatus = 'open' | 'planned' | 'awaiting_approval' | 'approved' | 'executing' | 'completed' | 'blocked' | 'failed';
  type OperatorApprovalState = 'not_required' | 'pending' | 'approved' | 'rejected';
  type OperatorExecutionMode = 'dry_run' | 'live';
  type UiSurface = 'dashboard' | 'operator' | 'settings';
  type UiCopilotIntent = 'surface_review' | 'component_brief' | 'layout_proposal' | 'a11y_audit' | 'design_regression';
  type UiCaseStatus = 'open' | 'planned' | 'reviewed';
  type OperatorRadialCenter = 'EP' | 'ARCH' | 'QA' | 'RISK' | 'OPS' | 'POL';
  type OperatorRadialDisposition = 'allow' | 'restrict' | 'observe';
  type OperatorDecisionKernel = {
    id: string;
    kernelId: 'KRN-001';
    zettelkastenRef: 'ZK-KRN-001';
    ntxTraceRef: 'TR#KRN-001';
    decision: 'read_only' | 'propose_only' | 'reversible_execute' | 'irreversible_execute';
    summary: string;
    taxonomy: {
      basePolicyClass: 'read_only' | 'propose_only' | 'reversible_execute' | 'irreversible_execute';
      reversibility: 'reversible' | 'irreversible';
      evidenceScore: number;
      conflictState: 'none' | 'open' | 'blocked';
      continuityState: 'broken' | 'partial' | 'complete';
      nodeKinds: string[];
      layerFocus: string[];
    };
    radialVotes: Array<{
      center: OperatorRadialCenter;
      disposition: OperatorRadialDisposition;
      weight: number;
      rationale: string;
    }>;
    restrictedRoutes: Array<{
      id: string;
      label: string;
      path: string[];
      status: 'allowed' | 'blocked';
      rationale: string;
    }>;
  };
  type OperationRecord = {
    id: string;
    name: string;
    owner: string;
    status: OperationStatus;
    updatedAt: string;
    risk: RiskLevel;
  };
  type NotificationSettings = {
    emailEnabled: boolean;
    slackEnabled: boolean;
    slackWebhookUrl: string;
  };
  type UiProposal = {
    tokens: string[];
    layoutChanges: string[];
    componentChanges: string[];
    a11yChecks: string[];
    acceptanceCriteria: string[];
  };
  type UiReviewReport = {
    id: string;
    caseId: string;
    generatedAt: string;
    summary: string;
    recommendations: string[];
    regressions: string[];
    screenshots: string[];
    evidenceRefs: string[];
    zkRefs: string[];
    traceId?: string;
    artifactManifestPath?: string;
    proposal: UiProposal;
  };
  type UiCopilotCase = {
    id: string;
    requester: string;
    surface: UiSurface;
    intent: UiCopilotIntent;
    summary: string;
    status: UiCaseStatus;
    traceId?: string;
    zkRefs: string[];
    createdAt: string;
    updatedAt: string;
    proposal?: UiProposal;
    report?: UiReviewReport;
  };
  type OperatorCaseRecord = {
    id: string;
    domain: OperatorDomain;
    intent: string;
    severity: OperatorSeverity;
    status: OperatorCaseStatus;
    approvalState: OperatorApprovalState;
    requester: string;
    updatedAt: string;
    traceContext?: {
      traceId?: string;
      reqId?: string;
      ctrId?: string;
      zkRefs?: string[];
      evidenceRefs?: string[];
      eid?: string;
      vids?: string[];
    };
    decisionKernel?: OperatorDecisionKernel;
    plan?: {
      kernelDirectives?: string[];
      steps: Array<{
        id: string;
        label: string;
        kind: string;
        adapter?: string;
      }>;
    };
    report?: {
      summary: string;
      narrative: string;
      evidence: string[];
      openRisks: string[];
      recommendations: string[];
      timeline: Array<Record<string, unknown>>;
      decisionKernel?: OperatorDecisionKernel;
    };
  };
  type ReleaseReadiness = {
    releaseGate: 'pass' | 'fail';
    coverageRatio?: number;
    errors: string[];
    criticalFailures: string[];
    envChecks: {
      rpcConfigured: boolean;
      privateKeyConfigured: boolean;
      deployScriptPresent: boolean;
      hardhatConfigPresent: boolean;
      liveDeployEnabled: boolean;
    };
    latestGuiEvidence?: {
      uiCaseId: string;
      manifestPath: string;
      generatedAt: string;
      captureMode: 'backend_coupled';
    };
  };

  interface Window {
    catalyst?: {
      refresh: () => Promise<{ ok: boolean; at: number }>;
      sepoliaStatus: () => Promise<
        | { ok: true; rpcUrl: string; chainId: number; blockNumber: number; at: number }
        | { ok: false; rpcUrl: string; error: string; at: number }
      >;
      operationsList: () => Promise<{ operations: OperationRecord[] }>;
      operationsCreate: (input: Partial<OperationRecord>) => Promise<{ operations: OperationRecord[] }>;
      notificationsGet: () => Promise<{ notifications: NotificationSettings }>;
      notificationsUpdate: (patch: Partial<NotificationSettings>) => Promise<{ notifications: NotificationSettings }>;
      aiCasesList: () => Promise<{ cases: OperatorCaseRecord[] }>;
      aiCaseCreate: (input: Record<string, unknown>) => Promise<OperatorCaseRecord>;
      aiCasePlan: (caseId: string) => Promise<OperatorCaseRecord>;
      aiCaseApprove: (caseId: string, input: Record<string, unknown>) => Promise<OperatorCaseRecord>;
      aiCaseExecute: (
        caseId: string,
        input: { mode?: OperatorExecutionMode; requestedBy?: string }
      ) => Promise<{ case: OperatorCaseRecord; receipt: Record<string, unknown>; report: OperatorCaseRecord['report'] }>;
      aiCaseReport: (caseId: string) => Promise<OperatorCaseRecord['report']>;
      aiReleaseReadiness: (domain?: OperatorDomain) => Promise<ReleaseReadiness>;
      uiCasesList: () => Promise<{ cases: UiCopilotCase[] }>;
      uiCaseCreate: (input: Record<string, unknown>) => Promise<UiCopilotCase>;
      uiCasePlan: (caseId: string) => Promise<UiCopilotCase>;
      uiCaseReport: (caseId: string) => Promise<UiReviewReport>;
    };
  }
}

export {};
