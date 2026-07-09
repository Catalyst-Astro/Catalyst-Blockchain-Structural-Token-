import type {
  ApprovalState,
  ClockchainCase,
  DecisionKernelAssessment,
  PolicyClass,
  RadialCenter,
  RadialDisposition,
  RadialVote,
  ResolvedTrace,
  RestrictedRoute,
  TaxonomyConflictState,
  TaxonomyContinuityState,
} from "./types";

type ReleaseReadinessSummary = {
  releaseGate: "pass" | "fail";
  errors: string[];
  criticalFailures: string[];
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function inferNodeKinds(trace: ResolvedTrace): string[] {
  const ids = Object.values(trace.nodesByStage).flat();
  return unique(
    ids
      .map((id) => id.split("-")[0])
      .filter((kind) => Boolean(kind))
  );
}

function computeContinuity(trace: ResolvedTrace): TaxonomyContinuityState {
  let score = 0;
  if (trace.traceId) score += 1;
  if (trace.reqId) score += 1;
  if (trace.ctrId) score += 1;
  if (trace.tests.length > 0) score += 1;
  if (trace.metrics.length > 0) score += 1;
  if (trace.evidenceRefs.length > 0) score += 1;

  if (score >= 6) {
    return "complete";
  }
  if (score >= 3) {
    return "partial";
  }
  return "broken";
}

function computeConflictState(trace: ResolvedTrace, readiness: ReleaseReadinessSummary): TaxonomyConflictState {
  if (readiness.criticalFailures.length > 0) {
    return "blocked";
  }

  const noteConflicts = trace.notes.flatMap((note) => note.conflicts);
  if (noteConflicts.length > 0 || readiness.errors.some((entry) => /conflict/i.test(entry))) {
    return "open";
  }

  return "none";
}

function computeEvidenceScore(trace: ResolvedTrace, readiness: ReleaseReadinessSummary): number {
  let score = 0.2;
  if (trace.traceId) score += 0.15;
  if (trace.reqId) score += 0.15;
  if (trace.ctrId) score += 0.15;
  if (trace.zkRefs.length > 0) score += 0.1;
  if (trace.artifacts.length > 0) score += 0.1;
  if (trace.tests.length > 0) score += 0.08;
  if (trace.metrics.length > 0) score += 0.08;
  if (trace.evidenceRefs.length > 0) score += 0.09;
  if (readiness.releaseGate === "pass") score += 0.05;
  if (readiness.errors.length > 0) score -= 0.08;
  if (readiness.criticalFailures.length > 0) score -= 0.12;
  return Number(clamp(score, 0.2, 1).toFixed(2));
}

function isIrreversible(policyClass: PolicyClass): boolean {
  return policyClass === "irreversible_execute";
}

function classifyReversibility(policyClass: PolicyClass): "reversible" | "irreversible" {
  return isIrreversible(policyClass) ? "irreversible" : "reversible";
}

function resolveDecision(
  basePolicyClass: PolicyClass,
  continuityState: TaxonomyContinuityState,
  conflictState: TaxonomyConflictState,
  evidenceScore: number
): PolicyClass {
  if (basePolicyClass === "read_only") {
    return "read_only";
  }

  if (conflictState === "blocked" || continuityState === "broken" || evidenceScore < 0.45) {
    return "propose_only";
  }

  if (basePolicyClass === "propose_only") {
    return "propose_only";
  }

  if (basePolicyClass === "reversible_execute" && (continuityState === "partial" || conflictState === "open")) {
    return "propose_only";
  }

  return basePolicyClass;
}

function buildVote(
  center: RadialCenter,
  disposition: RadialDisposition,
  weight: number,
  rationale: string
): RadialVote {
  return {
    center,
    disposition,
    weight: Number(weight.toFixed(2)),
    rationale,
  };
}

function buildRadialVotes(
  record: ClockchainCase,
  trace: ResolvedTrace,
  readiness: ReleaseReadinessSummary,
  continuityState: TaxonomyContinuityState,
  conflictState: TaxonomyConflictState,
  basePolicyClass: PolicyClass
): RadialVote[] {
  const votes: RadialVote[] = [];
  const approvalPending = basePolicyClass === "irreversible_execute" && record.approvalState !== "approved";

  votes.push(
    trace.traceId && trace.zkRefs.length > 0
      ? buildVote("EP", "allow", 0.95, "The case is grounded in a ZK note and a concrete NTX trace.")
      : buildVote("EP", "restrict", 0.98, "The case lacks the ZK or NTX anchors required for epistemic grounding.")
  );

  votes.push(
    trace.reqId && trace.ctrId && trace.artifacts.length > 0
      ? buildVote("ARCH", "allow", 0.91, "REQ, CTR, and artifacts form an end-to-end design path.")
      : buildVote("ARCH", "restrict", 0.94, "Architecture continuity is incomplete across REQ, CTR, and artifact layers.")
  );

  votes.push(
    trace.tests.length > 0 && trace.metrics.length > 0 && readiness.errors.length === 0
      ? buildVote("QA", "allow", 0.93, "The path has tests, metrics, and no active validation errors.")
      : buildVote("QA", "restrict", 0.97, "The path is missing tests, metrics, or has active validation errors.")
  );

  if (conflictState === "blocked") {
    votes.push(buildVote("RISK", "restrict", 0.99, "Critical failures keep the route blocked."));
  } else if (record.severity === "critical" || record.severity === "high") {
    votes.push(buildVote("RISK", "observe", 0.86, "High-severity cases stay under reinforced risk observation."));
  } else {
    votes.push(buildVote("RISK", "allow", 0.72, "No blocking contradictions are active for this case."));
  }

  votes.push(
    continuityState !== "broken" && trace.evidenceRefs.length > 0
      ? buildVote("OPS", "allow", 0.88, "Operations can follow the route from trace to evidence.")
      : buildVote("OPS", "restrict", 0.96, "Operational continuity is broken or evidence is missing.")
  );

  if (approvalPending) {
    votes.push(buildVote("POL", "restrict", 0.99, "AX12 requires human approval before irreversible execution."));
  } else if (conflictState === "blocked") {
    votes.push(buildVote("POL", "restrict", 0.98, "Governance blocks live movement while conflicts remain critical."));
  } else {
    votes.push(buildVote("POL", "allow", 0.9, "The policy gate remains compatible with the current approval state."));
  }

  return votes;
}

function buildRoutes(
  trace: ResolvedTrace,
  votes: RadialVote[],
  approvalState: ApprovalState,
  basePolicyClass: PolicyClass
): RestrictedRoute[] {
  const routes: RestrictedRoute[] = [];
  const radialBlocked = votes.some((vote) => vote.disposition === "restrict" && vote.center !== "POL");

  routes.push({
    id: "route-zk-ntx-runtime",
    label: "ZK note to runtime evidence",
    path: ["ZK", "NTX", "runtime", "evidence"],
    status: trace.zkRefs.length > 0 && Boolean(trace.traceId) && trace.evidenceRefs.length > 0 ? "allowed" : "blocked",
    rationale:
      trace.zkRefs.length > 0 && Boolean(trace.traceId) && trace.evidenceRefs.length > 0
        ? "The route is anchored from note to evidence."
        : "The route is missing a ZK note, NTX trace, or runtime evidence anchor.",
  });

  routes.push({
    id: "route-req-ctr-tst-met",
    label: "REQ to CTR to TST/MET",
    path: ["REQ", "CTR", "TST", "MET"],
    status: trace.reqId && trace.ctrId && trace.tests.length > 0 && trace.metrics.length > 0 ? "allowed" : "blocked",
    rationale:
      trace.reqId && trace.ctrId && trace.tests.length > 0 && trace.metrics.length > 0
        ? "The critical path satisfies REQ/CTR/TST/MET continuity."
        : "The critical path is missing REQ, CTR, tests, or metrics.",
  });

  routes.push({
    id: "route-radial-intersection",
    label: "Radial intersection",
    path: ["EP", "ARCH", "QA", "RISK", "OPS", "POL"],
    status: radialBlocked ? "blocked" : "allowed",
    rationale: radialBlocked
      ? "At least one radial center restricts the route."
      : "No radial center is currently blocking the route.",
  });

  routes.push({
    id: "route-live-mutation",
    label: "Approval gated live mutation",
    path: ["policy", "approval", "live"],
    status:
      basePolicyClass !== "irreversible_execute" || approvalState === "approved"
        ? "allowed"
        : "blocked",
    rationale:
      basePolicyClass !== "irreversible_execute"
        ? "The case does not require irreversible execution approval."
        : approvalState === "approved"
          ? "Human approval has been recorded for live mutation."
          : "Human approval is still required before live mutation.",
  });

  return routes;
}

export function buildKernelDirectives(assessment: DecisionKernelAssessment): string[] {
  const directives = [
    `Anchor the case in ${assessment.zettelkastenRef} and ${assessment.ntxTraceRef}.`,
    `Respect the ${assessment.taxonomy.continuityState} continuity state before moving to live execution.`,
  ];

  const blockedRoutes = assessment.restrictedRoutes.filter((route) => route.status === "blocked");
  if (blockedRoutes.length > 0) {
    directives.push(
      ...blockedRoutes.map((route) => `Do not bypass ${route.label.toLowerCase()}: ${route.rationale}`)
    );
  } else {
    directives.push("All restricted routes are currently open for the selected decision class.");
  }

  return directives;
}

export function assessDecisionKernel(input: {
  record: ClockchainCase;
  trace: ResolvedTrace;
  readiness: ReleaseReadinessSummary;
  basePolicyClass: PolicyClass;
}): DecisionKernelAssessment {
  const continuityState = computeContinuity(input.trace);
  const conflictState = computeConflictState(input.trace, input.readiness);
  const evidenceScore = computeEvidenceScore(input.trace, input.readiness);
  const decision = resolveDecision(input.basePolicyClass, continuityState, conflictState, evidenceScore);
  const radialVotes = buildRadialVotes(
    input.record,
    input.trace,
    input.readiness,
    continuityState,
    conflictState,
    input.basePolicyClass
  );
  const restrictedRoutes = buildRoutes(input.trace, radialVotes, input.record.approvalState, input.basePolicyClass);
  const blockedCenters = radialVotes.filter((vote) => vote.disposition === "restrict").map((vote) => vote.center);

  return {
    id: `kernel-${input.record.id}`,
    generatedAt: new Date().toISOString(),
    kernelId: "KRN-001",
    zettelkastenRef: "ZK-KRN-001",
    ntxTraceRef: "TR#KRN-001",
    taxonomy: {
      domain: input.record.domain,
      intent: input.record.intent,
      severity: input.record.severity,
      basePolicyClass: input.basePolicyClass,
      reversibility: classifyReversibility(input.basePolicyClass),
      evidenceScore,
      conflictState,
      continuityState,
      nodeKinds: inferNodeKinds(input.trace),
      layerFocus: unique(input.trace.notes.map((note) => note.layer)),
    },
    radialVotes,
    restrictedRoutes,
    decision,
    summary:
      blockedCenters.length > 0
        ? `Decision kernel ${decision} with restrictions from ${blockedCenters.join(", ")} over ${input.record.domain}.`
        : `Decision kernel ${decision} with no active radial restrictions over ${input.record.domain}.`,
  };
}
