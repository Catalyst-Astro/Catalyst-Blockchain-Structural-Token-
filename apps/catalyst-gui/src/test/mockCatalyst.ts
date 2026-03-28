const operatorCase: OperatorCaseRecord = {
  id: 'case-operator-1',
  domain: 'IDC',
  intent: 'verify_identity',
  severity: 'medium',
  status: 'planned',
  approvalState: 'not_required',
  requester: 'ops-desk',
  updatedAt: new Date('2026-03-20T10:00:00Z').toISOString(),
  traceContext: {
    traceId: 'IDC-001',
    reqId: 'REQ-IDC-001',
    ctrId: 'CTR-IDC-001',
    zkRefs: ['ZK-IDC-001'],
    evidenceRefs: ['EVD-IDC-001']
  },
  plan: {
    kernelDirectives: ['Keep ZK and NTX trace continuity visible in the case detail.'],
    steps: [
      { id: 'resolve_trace', label: 'Resolve ZK and NTX trace context', kind: 'trace' },
      { id: 'dry_run', label: 'Run deterministic adapter in dry-run mode', kind: 'execute' }
    ]
  }
};

const operatorReport: NonNullable<OperatorCaseRecord['report']> = {
  summary: 'IDC verify_identity case is planned with a governed decision kernel.',
  narrative: 'The case stays anchored to the trace and keeps dry-run before runtime execution.',
  evidence: ['EVD-IDC-001'],
  openRisks: [],
  recommendations: ['Maintain the same trace context in downstream evidence and reports.'],
  timeline: [],
  decisionKernel: {
    id: 'kernel-case-operator-1',
    kernelId: 'KRN-001',
    zettelkastenRef: 'ZK-KRN-001',
    ntxTraceRef: 'TR#KRN-001',
    decision: 'reversible_execute',
    summary: 'Decision kernel reversible_execute with no active radial restrictions over IDC.',
    taxonomy: {
      basePolicyClass: 'reversible_execute',
      reversibility: 'reversible',
      evidenceScore: 0.84,
      conflictState: 'none',
      continuityState: 'complete',
      nodeKinds: ['REQ', 'CTR', 'TST', 'MET'],
      layerFocus: ['L2-L7']
    },
    radialVotes: [
      { center: 'EP', disposition: 'allow', weight: 0.95, rationale: 'Anchored in ZK and NTX.' },
      { center: 'ARCH', disposition: 'allow', weight: 0.91, rationale: 'REQ and CTR are present.' }
    ],
    restrictedRoutes: [
      { id: 'route-req-ctr-tst-met', label: 'REQ to CTR to TST/MET', path: ['REQ', 'CTR', 'TST', 'MET'], status: 'allowed', rationale: 'Coverage is complete.' }
    ]
  }
};

const uiCase: UiCopilotCase = {
  id: 'ui-case-1',
  requester: 'design-ops',
  surface: 'dashboard',
  intent: 'surface_review',
  summary: 'Review the dashboard surface and preserve the critical scan path.',
  status: 'planned',
  traceId: 'GUI-001',
  zkRefs: ['ZK-GUI-001'],
  createdAt: new Date('2026-03-20T11:00:00Z').toISOString(),
  updatedAt: new Date('2026-03-20T11:00:00Z').toISOString(),
  proposal: {
    tokens: ['--primary', '--card'],
    layoutChanges: ['Keep hero and KPI band grouped.'],
    componentChanges: ['Preserve KPI tiles and searchable ledger.'],
    a11yChecks: ['Search control must keep explicit label.'],
    acceptanceCriteria: ['Dashboard remains legible without horizontal scrolling.']
  }
};

const uiReport: UiReviewReport = {
  id: 'ui-report-1',
  caseId: 'ui-case-1',
  generatedAt: new Date('2026-03-20T11:05:00Z').toISOString(),
  summary: 'dashboard surface_review stays anchored to GUI-001 and emits a governed UI proposal.',
  recommendations: ['Review the proposal before merging any UI change.'],
  regressions: [],
  screenshots: ['artifacts/gui/screenshots/dashboard.png'],
  evidenceRefs: ['backend/database/ui_reviews.jsonl', 'artifacts/gui/reports/ui-case-1.md'],
  zkRefs: ['ZK-GUI-001'],
  traceId: 'GUI-001',
  proposal: uiCase.proposal!
};

function createMatchMedia(): (query: string) => MediaQueryList {
  return (query: string) =>
    ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    }) as MediaQueryList;
}

export function installMockCatalyst() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: createMatchMedia()
  });

  window.catalyst = {
    refresh: async () => ({ ok: true, at: Date.now() }),
    sepoliaStatus: async () => ({ ok: true, rpcUrl: 'https://rpc.sepolia.org', chainId: 11155111, blockNumber: 123456, at: Date.now() }),
    operationsList: async () => ({
      operations: [
        {
          id: 'op-1',
          name: 'Operator escalation',
          owner: 'Ops Desk',
          status: 'active',
          updatedAt: '2026-03-20 10:00',
          risk: 'medium'
        }
      ]
    }),
    operationsCreate: async () => ({
      operations: [
        {
          id: 'op-2',
          name: 'New operation',
          owner: 'Ops Desk',
          status: 'pending',
          updatedAt: '2026-03-20 11:00',
          risk: 'medium'
        }
      ]
    }),
    notificationsGet: async () => ({
      notifications: { emailEnabled: true, slackEnabled: false, slackWebhookUrl: '' }
    }),
    notificationsUpdate: async (patch: Partial<NotificationSettings>) => ({
      notifications: {
        emailEnabled: patch.emailEnabled ?? true,
        slackEnabled: patch.slackEnabled ?? false,
        slackWebhookUrl: patch.slackWebhookUrl ?? ''
      }
    }),
    aiCasesList: async () => ({ cases: [operatorCase] }),
    aiCaseCreate: async () => operatorCase,
    aiCasePlan: async () => operatorCase,
    aiCaseApprove: async () => operatorCase,
    aiCaseExecute: async () => ({ case: operatorCase, receipt: {}, report: operatorReport }),
    aiCaseReport: async () => operatorReport,
    aiReleaseReadiness: async () => ({
      releaseGate: 'pass',
      coverageRatio: 1,
      errors: [],
      criticalFailures: [],
      envChecks: {
        rpcConfigured: true,
        privateKeyConfigured: false,
        deployScriptPresent: true,
        hardhatConfigPresent: true,
        liveDeployEnabled: false
      }
    }),
    uiCasesList: async () => ({ cases: [uiCase] }),
    uiCaseCreate: async () => uiCase,
    uiCasePlan: async () => uiCase,
    uiCaseReport: async () => uiReport
  };
}
