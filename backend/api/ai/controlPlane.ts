import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

import { StoryLedger } from "../storyLedger";
import { readJsonl } from "../utils";
import { assessDecisionKernel, buildKernelDirectives } from "./decisionKernel";
import { buildModelPacket, inferModelExplanation } from "./modelBoundary";
import { decidePolicy, inferSeverity } from "./policy";
import { ClockchainCaseStore } from "./store";
import { ClockchainTraceResolver } from "./traceability";
import type {
  ApprovalRequest,
  ApproveCaseInput,
  CasePlan,
  CaseReport,
  ClockchainCase,
  ClockchainCaseStatus,
  ClockchainDomain,
  ClockchainIntent,
  CaseStep,
  CreateCaseInput,
  ExecuteCaseInput,
  ExecutionMode,
  ExecutionReceipt,
  ExecutionStepResult,
  ResolvedTrace,
  TraceContext,
  DecisionKernelAssessment,
} from "./types";

class OperatorAiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

type ExecutionAdapter = {
  name: string;
  endpoint: string;
  buildPath: (input: Record<string, unknown>) => string;
  buildBody: (input: Record<string, unknown>, traceContext: TraceContext, mode: ExecutionMode) => Record<string, unknown>;
  extractRefs: (output: unknown) => string[];
};

type RuntimeClient = {
  request: (adapter: ExecutionAdapter, input: Record<string, unknown>, traceContext: TraceContext, mode: ExecutionMode) => Promise<unknown>;
};

const NARRATIVE_LEDGER_PATH =
  process.env.CATALYST_NARRATIVE_LEDGER_PATH ?? path.join(process.cwd(), "narrative_memory", "narrative_ledger.jsonl");

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeStringArray(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }
  const normalized = [...new Set(values.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean))].sort();
  return normalized.length > 0 ? normalized : undefined;
}

function inferDomain(summary: string, input: Record<string, unknown>): ClockchainDomain {
  const source = `${summary} ${JSON.stringify(input)}`.toLowerCase();
  if (source.includes("identity") || source.includes("credential") || source.includes("aml") || source.includes("compliance")) {
    return "IDC";
  }
  if (source.includes("cash") || source.includes("ramp") || source.includes("settlement") || source.includes("payment")) {
    return "RMP";
  }
  if (source.includes("deploy") || source.includes("release") || source.includes("network") || source.includes("value engine")) {
    return "VAL";
  }
  return "EVT";
}

function normalizeIntent(intent: ClockchainIntent | undefined, domain: ClockchainDomain, summary: string, input: Record<string, unknown>): ClockchainIntent {
  if (intent) {
    return intent;
  }

  const action = String(input.action ?? summary).toLowerCase();
  switch (domain) {
    case "VAL":
      if (action.includes("deploy")) return action.includes("ready") ? "deploy_readiness" : "deploy";
      return "release_readiness";
    case "IDC":
      if (action.includes("revoke") && action.includes("credential")) return "revoke_credential";
      if (action.includes("revoke")) return "revoke_identity";
      if (action.includes("issue") || action.includes("issuing")) return "issue_credential";
      if (action.includes("aml") || action.includes("score")) return "score_aml";
      return "verify_identity";
    case "RMP":
      if (action.includes("cash out") && action.includes("confirm")) return "cash_out_confirm";
      if (action.includes("cash out")) return "cash_out_request";
      if (action.includes("incident")) return "incident_settlement";
      if (action.includes("confirm")) return "cash_in_confirm";
      return "cash_in_request";
    case "EVT":
    default:
      if (action.includes("reject")) return "reject_event";
      if (action.includes("verify")) return "verify_event";
      if (action.includes("attest")) return "attest_event";
      if (action.includes("audit") || action.includes("trace")) return "audit_event";
      return "create_event";
  }
}

function deriveStatusForPlan(requiresApproval: boolean): ClockchainCaseStatus {
  return requiresApproval ? "awaiting_approval" : "planned";
}

function ensureTraceContext(trace: ResolvedTrace, override: TraceContext = {}): TraceContext {
  return {
    traceId: override.traceId ?? trace.traceId,
    reqId: override.reqId ?? trace.reqId,
    ctrId: override.ctrId ?? trace.ctrId,
    zkRefs: normalizeStringArray(override.zkRefs) ?? trace.zkRefs,
    evidenceRefs: normalizeStringArray(override.evidenceRefs) ?? trace.evidenceRefs,
    eid: override.eid,
    vids: normalizeStringArray(override.vids),
  };
}

function buildRefList(...values: Array<string | undefined | null | string[]>): string[] {
  return [...new Set(values.flat().filter((entry): entry is string => typeof entry === "string" && entry.length > 0))].sort();
}

function buildExecutionAdapter(intent: ClockchainIntent): ExecutionAdapter | null {
  switch (intent) {
    case "verify_identity":
      return {
        name: "identity_verify",
        endpoint: "/identity/verify",
        buildPath: () => "/identity/verify",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).vid as string | undefined),
      };
    case "issue_credential":
      return {
        name: "credential_issue",
        endpoint: "/credential/issue",
        buildPath: () => "/credential/issue",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).vid as string | undefined),
      };
    case "revoke_identity":
      return {
        name: "identity_revoke",
        endpoint: "/identity/revoke",
        buildPath: () => "/identity/revoke",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined),
      };
    case "revoke_credential":
      return {
        name: "credential_revoke",
        endpoint: "/credential/revoke",
        buildPath: () => "/credential/revoke",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined),
      };
    case "score_aml":
      return {
        name: "aml_score",
        endpoint: "/aml/score",
        buildPath: () => "/aml/score",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).anchorTx as string | undefined, asRecord(output).txHash as string | undefined),
      };
    case "create_event":
      return {
        name: "event_create",
        endpoint: "/events",
        buildPath: () => "/events",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, normalizeStringArray(asRecord(output).vids)),
      };
    case "attest_event":
      return {
        name: "event_attest",
        endpoint: "/events/:eid/attest",
        buildPath: (input) => `/events/${String(input.eid ?? "")}/attest`,
        buildBody: (input, traceContext, mode) => ({ actorWallet: input.actorWallet, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).txHash as string | undefined),
      };
    case "verify_event":
      return {
        name: "event_verify",
        endpoint: "/events/:eid/verify",
        buildPath: (input) => `/events/${String(input.eid ?? "")}/verify`,
        buildBody: (input, traceContext, mode) => ({ actorWallet: input.actorWallet, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).txHash as string | undefined),
      };
    case "reject_event":
      return {
        name: "event_reject",
        endpoint: "/events/:eid/reject",
        buildPath: (input) => `/events/${String(input.eid ?? "")}/reject`,
        buildBody: (input, traceContext, mode) => ({ actorWallet: input.actorWallet, reason: input.reason, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).reasonHash as string | undefined),
      };
    case "cash_in_request":
      return {
        name: "ramp_cash_in_request",
        endpoint: "/ramps/cash-in/request",
        buildPath: () => "/ramps/cash-in/request",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).paymentRefHash as string | undefined),
      };
    case "cash_in_confirm":
      return {
        name: "ramp_cash_in_confirm",
        endpoint: "/ramps/cash-in/confirm",
        buildPath: () => "/ramps/cash-in/confirm",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).confirmationVID as string | undefined),
      };
    case "cash_out_request":
      return {
        name: "ramp_cash_out_request",
        endpoint: "/ramps/cash-out/request",
        buildPath: () => "/ramps/cash-out/request",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).payoutRefHash as string | undefined),
      };
    case "cash_out_confirm":
      return {
        name: "ramp_cash_out_confirm",
        endpoint: "/ramps/cash-out/confirm",
        buildPath: () => "/ramps/cash-out/confirm",
        buildBody: (input, traceContext, mode) => ({ ...input, ...traceContext, dryRun: mode !== "live" }),
        extractRefs: (output) => buildRefList(asRecord(output).eid as string | undefined, asRecord(output).confirmationVID as string | undefined),
      };
    default:
      return null;
  }
}

function buildPlanSteps(
  record: ClockchainCase,
  trace: ResolvedTrace,
  requiresApproval: boolean,
  decisionKernel: DecisionKernelAssessment
): CasePlan {
  const adapter = buildExecutionAdapter(record.intent);
  const kernelDirectives = buildKernelDirectives(decisionKernel);
  const baseSteps: CaseStep[] = [
    {
      id: "resolve_trace",
      label: "Resolve ZK and NTX trace context",
      kind: "trace" as const,
      detail: `Anchor case in ${trace.traceId ?? record.domain}, ${decisionKernel.zettelkastenRef}, and ${decisionKernel.ntxTraceRef}.`,
    },
  ];

  const kernelRestrictedToGuidance =
    (decisionKernel.decision === "read_only" && decisionKernel.taxonomy.basePolicyClass !== "read_only") ||
    (decisionKernel.decision === "propose_only" &&
      decisionKernel.taxonomy.basePolicyClass !== "propose_only" &&
      record.intent !== "incident_settlement");

  if (kernelRestrictedToGuidance) {
    return {
      caseId: record.id,
      generatedAt: new Date().toISOString(),
      dryRunRequired: false,
      adapters: ["clockchain_decision_kernel"],
      impact: "Guidance-only route because the decision kernel keeps execution restricted.",
      preconditions: ["Trace context resolved", "blocked routes reviewed by an operator"],
      expectedEvidence: buildRefList(trace.traceId, trace.evidenceRefs, trace.metrics),
      kernelDirectives,
      rollbackHandoff: "Escalate to engineer or approver after restoring continuity and unblocking the route.",
      modelExplanation: record.modelExplanation,
      steps: [
        ...baseSteps,
        {
          id: "kernel_gate",
          label: "Review decision-kernel restrictions and blocked routes",
          kind: "audit",
          adapter: "clockchain_decision_kernel",
          detail: decisionKernel.summary,
        },
        {
          id: "report",
          label: "Persist restricted-route report",
          kind: "report",
        },
      ],
    };
  }

  if (record.intent === "deploy") {
    return {
      caseId: record.id,
      generatedAt: new Date().toISOString(),
      dryRunRequired: true,
      adapters: ["value_engine_deploy"],
      impact: "Governed value-engine deployment path.",
      preconditions: ["Release gate passes", "dry-run compile succeeds", "human approval recorded", "ENABLE_CLOCKCHAIN_DEPLOY=1 for live"],
      expectedEvidence: buildRefList(trace.traceId, trace.evidenceRefs, trace.metrics),
      kernelDirectives,
      rollbackHandoff: "If deployment is blocked or fails, preserve command output and escalate to engineer.",
      modelExplanation: record.modelExplanation,
      steps: [
        ...baseSteps,
        { id: "release_gate", label: "Run release readiness and network checks", kind: "readiness", adapter: "clockchain_release_gate" },
        { id: "dry_run", label: "Compile deployment path in dry-run mode", kind: "execute", adapter: "value_engine_deploy", detail: "hardhat compile", dryRun: true },
        { id: "approval", label: "Await human approval for live deploy", kind: "approval", detail: "AX12 gate" },
        { id: "execute", label: "Run value-engine deployment script", kind: "execute", adapter: "value_engine_deploy", detail: "hardhat run scripts/deploy_value_engine.ts", dryRun: false },
        { id: "report", label: "Persist deployment report and evidence summary", kind: "report" },
      ],
    };
  }

  if (record.intent === "release_readiness" || record.intent === "deploy_readiness") {
    return {
      caseId: record.id,
      generatedAt: new Date().toISOString(),
      dryRunRequired: false,
      adapters: ["clockchain_release_gate"],
      impact: "Read-only deployment and coverage validation.",
      preconditions: ["NTX files present", "validator available", "operator has repo access"],
      expectedEvidence: buildRefList(trace.traceId, trace.evidenceRefs, trace.metrics),
      kernelDirectives,
      rollbackHandoff: "Escalate failures to engineer with readiness report and trace gaps.",
      modelExplanation: record.modelExplanation,
      steps: [
        ...baseSteps,
        { id: "release_gate", label: "Run release readiness and network checks", kind: "readiness", adapter: "clockchain_release_gate" },
        { id: "report", label: "Emit auditable readiness report", kind: "report" },
      ],
    };
  }

  if (record.intent === "incident_settlement" || !adapter) {
    return {
      caseId: record.id,
      generatedAt: new Date().toISOString(),
      dryRunRequired: false,
      adapters: ["incident_timeline"],
      impact: "Guidance-only incident analysis.",
      preconditions: ["Relevant eid or traceId available"],
      expectedEvidence: buildRefList(trace.traceId, trace.evidenceRefs),
      kernelDirectives,
      rollbackHandoff: "Escalate to approver or engineer if runtime mutation becomes necessary.",
      modelExplanation: record.modelExplanation,
      steps: [
        ...baseSteps,
        { id: "incident_timeline", label: "Assemble incident timeline and relevant evidence", kind: "audit", adapter: "incident_timeline" },
        { id: "report", label: "Generate postmortem seed and recommendations", kind: "report" },
      ],
    };
  }

  const steps: CaseStep[] = [
    ...baseSteps,
    { id: "dry_run", label: "Run deterministic adapter in dry-run mode", kind: "execute" as const, adapter: adapter.name, endpoint: adapter.endpoint, dryRun: true },
  ];

  if (requiresApproval) {
    steps.push({
      id: "approval",
      label: "Await human approval for irreversible action",
      kind: "approval",
      detail: "AX12 gate",
    });
  }

  steps.push(
    {
      id: "execute",
      label: "Execute governed runtime adapter",
      kind: "execute",
      adapter: adapter.name,
      endpoint: adapter.endpoint,
      dryRun: false,
    },
    {
      id: "report",
      label: "Persist case report and evidence summary",
      kind: "report",
    }
  );

  return {
    caseId: record.id,
    generatedAt: new Date().toISOString(),
    dryRunRequired: true,
    adapters: [adapter.name],
    impact: `${record.intent} through existing backend runtime API.`,
    preconditions: ["Trace context resolved", "dry-run completed", ...(requiresApproval ? ["human approval recorded"] : [])],
    expectedEvidence: buildRefList(trace.traceId, trace.evidenceRefs, trace.metrics),
    kernelDirectives,
    rollbackHandoff: requiresApproval
      ? "If live execution fails, keep case blocked and escalate with receipt + case report."
      : "If live execution fails, preserve dry-run receipt and escalate to operator.",
    modelExplanation: record.modelExplanation,
    steps,
  };
}

export class ClockchainOperatorAI {
  private readonly store: ClockchainCaseStore;
  private readonly traceResolver: ClockchainTraceResolver;
  private readonly ledger: StoryLedger;
  private readonly runtimeClient: RuntimeClient;

  constructor(options: {
    store?: ClockchainCaseStore;
    traceResolver?: ClockchainTraceResolver;
    ledger?: StoryLedger;
    runtimeClient?: RuntimeClient;
  } = {}) {
    this.store = options.store ?? new ClockchainCaseStore();
    this.traceResolver = options.traceResolver ?? new ClockchainTraceResolver();
    this.ledger = options.ledger ?? new StoryLedger(NARRATIVE_LEDGER_PATH);
    this.runtimeClient =
      options.runtimeClient ??
      ({
        request: async (adapter, input, traceContext, mode) => {
          const baseUrl = process.env.CLOCKCHAIN_OPERATOR_API_URL ?? `http://127.0.0.1:${process.env.PORT ?? 4000}`;
          const response = await fetch(`${baseUrl}${adapter.buildPath(input)}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(adapter.buildBody(input, traceContext, mode)),
          });
          const payload = (await response.json()) as unknown;
          if (!response.ok) {
            throw new OperatorAiError(response.status, String(asRecord(payload).error ?? "Runtime adapter failed"));
          }
          return payload;
        },
      } satisfies RuntimeClient);
  }

  listCases(): ClockchainCase[] {
    return this.store.listCases().map((record) => this.enrichCase(record));
  }

  getCase(caseId: string): ClockchainCase {
    const record = this.store.getCase(caseId);
    if (!record) {
      throw new OperatorAiError(404, `Case ${caseId} not found`);
    }
    return this.enrichCase(record);
  }

  createCase(input: CreateCaseInput): ClockchainCase {
    if (!input.requester || !input.summary) {
      throw new OperatorAiError(400, "requester and summary are required");
    }

    const now = new Date().toISOString();
    const normalizedInput = asRecord(input.input);
    const domain = input.domain ?? inferDomain(input.summary, normalizedInput);
    const intent = normalizeIntent(input.intent, domain, input.summary, normalizedInput);
    const severity = input.severity ?? inferSeverity(domain, intent, input.summary);
    const trace = this.traceResolver.resolve(domain, input.traceContext?.traceId);
    const traceContext = ensureTraceContext(trace, input.traceContext);
    const policy = decidePolicy(domain, intent);
    const record = this.enrichCase({
      id: `case-${randomUUID()}`,
      domain,
      intent,
      severity,
      status: "open",
      requester: input.requester,
      requesterRole: input.requesterRole ?? "operator",
      summary: input.summary,
      input: normalizedInput,
      traceContext,
      policyClass: policy.policyClass,
      approvalState: policy.requiresApproval ? "pending" : "not_required",
      createdAt: now,
      updatedAt: now,
      version: 1,
      modelPacket: buildModelPacket(domain, intent, severity, input.summary, normalizedInput, traceContext),
      modelExplanation: inferModelExplanation(domain, intent),
    });

    this.store.saveCase(record);
    this.ledger.logAction("operator_ai", `case_created caseId=${record.id} intent=${record.intent}`, {
      traceId: record.traceContext.traceId,
      reqId: record.traceContext.reqId,
      ctrId: record.traceContext.ctrId,
      zkRefs: record.traceContext.zkRefs,
      evidenceRefs: record.traceContext.evidenceRefs,
      status: "open",
    });
    return this.getCase(record.id);
  }

  generatePlan(caseId: string): ClockchainCase {
    const record = this.getCase(caseId);
    const trace = this.traceResolver.resolve(record.domain, record.traceContext.traceId);
    const policy = decidePolicy(record.domain, record.intent);
    const decisionKernel = this.buildDecisionKernel(record, trace);
    const plan = buildPlanSteps(record, trace, policy.requiresApproval, decisionKernel);
    const requiresApproval = policy.requiresApproval && decisionKernel.decision === "irreversible_execute";
    const updated = this.saveCaseSnapshot({
      ...record,
      traceContext: ensureTraceContext(trace, record.traceContext),
      decisionKernel,
      policyClass: decisionKernel.decision,
      status: deriveStatusForPlan(requiresApproval),
      approvalState: requiresApproval ? record.approvalState : "not_required",
      updatedAt: new Date().toISOString(),
      plan,
    });

    this.ledger.logAction("operator_ai", `case_planned caseId=${record.id}`, {
      traceId: updated.traceContext.traceId,
      reqId: updated.traceContext.reqId,
      ctrId: updated.traceContext.ctrId,
      zkRefs: updated.traceContext.zkRefs,
      evidenceRefs: updated.traceContext.evidenceRefs,
      status: updated.status,
    });
    return updated;
  }

  approveCase(caseId: string, input: ApproveCaseInput): ClockchainCase {
    const record = this.getCase(caseId);
    const policy = decidePolicy(record.domain, record.intent);
    if (!policy.requiresApproval || record.policyClass !== "irreversible_execute") {
      throw new OperatorAiError(409, `Case ${caseId} does not require approval`);
    }
    if (!input.decidedBy || !input.decision) {
      throw new OperatorAiError(400, "decidedBy and decision are required");
    }

    const approval: ApprovalRequest = {
      id: `approval-${randomUUID()}`,
      caseId: record.id,
      action: record.intent,
      justification: policy.rationale,
      risk: record.severity,
      irreversibleEffects: [record.intent],
      approverRole: policy.approverRole,
      requestedBy: input.requester ?? record.requester,
      requestedAt: record.updatedAt,
      decision: input.decision,
      decidedAt: new Date().toISOString(),
      decidedBy: input.decidedBy,
      reason: input.reason,
    };

    this.store.saveApproval(approval);
    const updated = this.saveCaseSnapshot({
      ...record,
      approvalState: approval.decision,
      status: approval.decision === "approved" ? "approved" : "blocked",
      updatedAt: approval.decidedAt,
    });

    this.ledger.logAction("operator_ai", `case_approval caseId=${record.id} decision=${approval.decision}`, {
      traceId: updated.traceContext.traceId,
      reqId: updated.traceContext.reqId,
      ctrId: updated.traceContext.ctrId,
      zkRefs: updated.traceContext.zkRefs,
      evidenceRefs: buildRefList(updated.traceContext.evidenceRefs, approval.id),
      status: updated.status,
    });
    return updated;
  }

  async executeCase(caseId: string, input: ExecuteCaseInput = {}): Promise<{ case: ClockchainCase; receipt: ExecutionReceipt; report: CaseReport }> {
    const record = this.getCase(caseId);
    const policy = decidePolicy(record.domain, record.intent);
    const plan = record.plan ?? this.generatePlan(caseId).plan;
    const decisionKernel = record.decisionKernel ?? this.buildDecisionKernel(record);
    if (!plan) {
      throw new OperatorAiError(500, `Plan generation failed for ${caseId}`);
    }
    if (policy.requiresApproval && record.approvalState !== "approved") {
      throw new OperatorAiError(409, `Case ${caseId} requires approval before execution`);
    }

    const mode = input.mode ?? "dry_run";
    if (mode === "live" && (record.policyClass === "read_only" || record.policyClass === "propose_only")) {
      throw new OperatorAiError(409, `Case ${caseId} is restricted to ${record.policyClass} by the decision kernel`);
    }
    if (mode === "live" && decisionKernel.taxonomy.conflictState === "blocked") {
      throw new OperatorAiError(409, `Case ${caseId} has a blocked conflict state and cannot execute live`);
    }
    if (mode === "live" && decisionKernel.taxonomy.continuityState === "broken") {
      throw new OperatorAiError(409, `Case ${caseId} has broken continuity and cannot execute live`);
    }

    const startedAt = new Date().toISOString();
    const stepResults: ExecutionStepResult[] = [];
    const errors: string[] = [];
    const outputRefs = new Set<string>();

    const trace = this.traceResolver.resolve(record.domain, record.traceContext.traceId);
    const traceContext = ensureTraceContext(trace, record.traceContext);
    const updatedCase = this.saveCaseSnapshot({ ...record, status: "executing", updatedAt: startedAt, traceContext });

    if (record.intent === "deploy") {
      const readiness = this.getReleaseReadiness(record.domain);
      stepResults.push({
        stepId: "release_gate",
        label: "Run release readiness and network checks",
        adapter: "clockchain_release_gate",
        mode: "dry_run",
        status: readiness.releaseGate === "pass" ? "completed" : "failed",
        output: readiness,
        error: readiness.releaseGate === "pass" ? undefined : "Release gate failed",
      });
      if (readiness.releaseGate !== "pass") {
        errors.push("Release gate failed");
      }

      const dryRunCompile = this.runDeployCommand("dry_run", updatedCase.input);
      stepResults.push(dryRunCompile.result);
      dryRunCompile.refs.forEach((ref) => outputRefs.add(ref));
      if (dryRunCompile.result.error) {
        errors.push(dryRunCompile.result.error);
      }

      if (mode === "live" && errors.length === 0) {
        const liveDeploy = this.runDeployCommand("live", updatedCase.input);
        stepResults.push(liveDeploy.result);
        liveDeploy.refs.forEach((ref) => outputRefs.add(ref));
        if (liveDeploy.result.error) {
          errors.push(liveDeploy.result.error);
        }
      }
    } else if (record.intent === "release_readiness" || record.intent === "deploy_readiness") {
      const readiness = this.getReleaseReadiness(record.domain);
      stepResults.push({
        stepId: "release_gate",
        label: "Run release readiness and network checks",
        adapter: "clockchain_release_gate",
        mode: "dry_run",
        status: readiness.releaseGate === "pass" ? "completed" : "failed",
        output: readiness,
        error: readiness.releaseGate === "pass" ? undefined : "Release gate failed",
      });
      if (readiness.releaseGate !== "pass") {
        errors.push("Release gate failed");
      }
    } else if (record.intent === "incident_settlement") {
      const timeline = this.collectTimeline(updatedCase);
      stepResults.push({
        stepId: "incident_timeline",
        label: "Assemble incident timeline and relevant evidence",
        adapter: "incident_timeline",
        mode: "dry_run",
        status: "completed",
        output: timeline,
      });
      timeline.flatMap((entry) => buildRefList(entry.traceId as string | undefined, entry.eid as string | undefined)).forEach((ref) => outputRefs.add(ref));
    } else if (record.policyClass === "propose_only" || record.policyClass === "read_only") {
      stepResults.push({
        stepId: "kernel_gate",
        label: "Review decision-kernel restrictions and blocked routes",
        adapter: "clockchain_decision_kernel",
        mode: "dry_run",
        status: "completed",
        output: {
          decision: decisionKernel.decision,
          summary: decisionKernel.summary,
          restrictedRoutes: decisionKernel.restrictedRoutes,
        },
      });
    } else {
      const adapter = buildExecutionAdapter(record.intent);
      if (!adapter) {
        throw new OperatorAiError(409, `No execution adapter found for ${record.intent}`);
      }

      const dryRunResult = await this.runAdapter(adapter, updatedCase.input, traceContext, "dry_run", "dry_run", "Run deterministic adapter in dry-run mode");
      stepResults.push(dryRunResult.result);
      dryRunResult.refs.forEach((ref) => outputRefs.add(ref));
      if (dryRunResult.result.error) {
        errors.push(dryRunResult.result.error);
      }

      if (mode === "live" && errors.length === 0) {
        const liveResult = await this.runAdapter(adapter, updatedCase.input, traceContext, "live", "execute", "Execute governed runtime adapter");
        stepResults.push(liveResult.result);
        liveResult.refs.forEach((ref) => outputRefs.add(ref));
        if (liveResult.result.error) {
          errors.push(liveResult.result.error);
        }
      }
    }

    const completedAt = new Date().toISOString();
    const receipt: ExecutionReceipt = {
      id: `receipt-${randomUUID()}`,
      caseId: record.id,
      mode,
      startedAt,
      completedAt,
      status: errors.length > 0 ? "failed" : "completed",
      outputRefs: [...outputRefs].sort(),
      errors,
      steps: stepResults,
    };
    this.store.saveReceipt(receipt);

    const status: ClockchainCaseStatus = errors.length > 0 ? "failed" : mode === "live" ? "completed" : "planned";
    this.saveCaseSnapshot({
      ...updatedCase,
      status,
      updatedAt: completedAt,
    });
    const report = this.buildReport(record.id);

    this.ledger.logAction("operator_ai", `case_executed caseId=${record.id} mode=${mode}`, {
      traceId: traceContext.traceId,
      reqId: traceContext.reqId,
      ctrId: traceContext.ctrId,
      zkRefs: traceContext.zkRefs,
      evidenceRefs: buildRefList(traceContext.evidenceRefs, receipt.outputRefs),
      status,
    });

    return {
      case: this.getCase(record.id),
      receipt,
      report,
    };
  }

  buildReport(caseId: string): CaseReport {
    const record = this.getCase(caseId);
    const trace = this.traceResolver.resolve(record.domain, record.traceContext.traceId);
    const readiness = this.getReleaseReadiness(record.domain);
    const decisionKernel = record.decisionKernel ?? this.buildDecisionKernel(record, trace);
    const approvals = record.approvals ?? [];
    const receipts = record.receipts ?? [];
    const timeline = this.collectTimeline(record);

    const report: CaseReport = {
      id: `report-${randomUUID()}`,
      caseId: record.id,
      generatedAt: new Date().toISOString(),
      summary: `${record.domain} ${record.intent} case ${record.id} is ${record.status} with kernel decision ${decisionKernel.decision}.`,
      narrative: `Case ${record.id} stayed anchored to ${trace.traceId ?? record.domain}, ${decisionKernel.zettelkastenRef}, and ${decisionKernel.ntxTraceRef}; the radial decision model produced ${decisionKernel.decision} and ${receipts.length} execution receipt(s).`,
      traceCoverage: {
        domain: record.domain,
        traceId: trace.traceId,
        coverageRatio: readiness.coverageRatio,
        releaseGate: readiness.releaseGate,
        validationErrors: readiness.errors,
        criticalFailures: readiness.criticalFailures,
      },
      evidence: buildRefList(
        trace.evidenceRefs,
        record.traceContext.evidenceRefs,
        receipts.flatMap((receipt) => receipt.outputRefs),
        approvals.map((approval) => approval.id)
      ),
      policyDecisions: [
        `policy=${record.policyClass}`,
        `basePolicy=${decisionKernel.taxonomy.basePolicyClass}`,
        `kernelDecision=${decisionKernel.decision}`,
        `approvalState=${record.approvalState}`,
        ...(approvals.map((approval) => `${approval.decision} by ${approval.decidedBy}`)),
      ],
      openRisks: this.collectOpenRisks(record, readiness.errors, readiness.criticalFailures, receipts, decisionKernel),
      recommendations: this.collectRecommendations(record, readiness.errors, readiness.criticalFailures, decisionKernel),
      timeline,
      decisionKernel,
    };

    this.store.saveReport(report);
    this.saveCaseSnapshot({ ...record, report, updatedAt: report.generatedAt });
    return report;
  }

  getTrace(traceId: string): ResolvedTrace {
    const domain = traceId.match(/^([A-Z0-9]+)-\d+$/)?.[1] as ClockchainDomain | undefined;
    if (!domain) {
      throw new OperatorAiError(400, `Unable to infer domain from trace ${traceId}`);
    }
    return this.traceResolver.resolve(domain, traceId);
  }

  getReleaseReadiness(domain?: ClockchainDomain) {
    const readiness = this.traceResolver.getReleaseReadiness(domain);
    const envChecks = {
      rpcConfigured: Boolean(process.env.RPC_URL),
      privateKeyConfigured: Boolean(process.env.PRIVATE_KEY),
      deployScriptPresent: fs.existsSync(path.join(process.cwd(), "scripts", "deploy_value_engine.ts")),
      hardhatConfigPresent:
        fs.existsSync(path.join(process.cwd(), "hardhat.config.ts")) || fs.existsSync(path.join(process.cwd(), "hardhat.config.js")),
      liveDeployEnabled: process.env.ENABLE_CLOCKCHAIN_DEPLOY === "1",
    };
    const coverageRatios = Object.values(readiness.coverageByDomain ?? {}).map((entry) => entry?.coverageRatio ?? 0);
    const coverageRatio = coverageRatios.length > 0 ? Math.min(...coverageRatios) : undefined;
    const releaseGate: "pass" | "fail" =
      readiness.errors.length === 0 &&
      readiness.criticalFailures.length === 0 &&
      envChecks.deployScriptPresent &&
      envChecks.hardhatConfigPresent
        ? "pass"
        : "fail";

    return {
      ...readiness,
      coverageRatio,
      envChecks,
      releaseGate,
    };
  }

  private collectRecommendations(
    record: ClockchainCase,
    errors: string[],
    criticalFailures: string[],
    decisionKernel: DecisionKernelAssessment
  ): string[] {
    const recommendations: string[] = [];
    if (errors.length > 0 || criticalFailures.length > 0) {
      recommendations.push("Close trace coverage gaps before live execution.");
    }
    const blockedRoutes = decisionKernel.restrictedRoutes.filter((route) => route.status === "blocked");
    if (blockedRoutes.length > 0) {
      recommendations.push(...blockedRoutes.map((route) => `Unblock ${route.label.toLowerCase()} before live execution.`));
    }
    if (record.approvalState === "pending") {
      recommendations.push("Request approver review before irreversible execution.");
    }
    if (record.intent === "incident_settlement") {
      recommendations.push("Attach the generated timeline to a ZK postmortem draft.");
    }
    if (recommendations.length === 0) {
      recommendations.push("Maintain the same trace context in downstream evidence and reports.");
    }
    return recommendations;
  }

  private collectOpenRisks(
    record: ClockchainCase,
    errors: string[],
    criticalFailures: string[],
    receipts: ExecutionReceipt[],
    decisionKernel: DecisionKernelAssessment
  ): string[] {
    const out: string[] = [...errors, ...criticalFailures];
    out.push(
      ...decisionKernel.restrictedRoutes
        .filter((route) => route.status === "blocked")
        .map((route) => `${route.label}: ${route.rationale}`)
    );
    if (record.policyClass === "irreversible_execute" && record.approvalState !== "approved") {
      out.push("Irreversible execution remains unapproved.");
    }
    for (const receipt of receipts) {
      out.push(...receipt.errors);
    }
    return [...new Set(out)];
  }

  private collectTimeline(record: ClockchainCase): Array<Record<string, unknown>> {
    const timeline: Array<Record<string, unknown>> = [];
    if (fs.existsSync(NARRATIVE_LEDGER_PATH)) {
      const narrativeEntries = readJsonl<Record<string, unknown>>(NARRATIVE_LEDGER_PATH).filter((entry) => this.matchesTrace(record, entry));
      timeline.push(...narrativeEntries);
    }

    const dataDir = process.env.CATALYST_DATA_DIR
      ? path.resolve(process.env.CATALYST_DATA_DIR)
      : path.join(process.cwd(), "backend", "database");
    if (fs.existsSync(dataDir)) {
      for (const entry of fs.readdirSync(dataDir)) {
        if (!entry.toLowerCase().endsWith(".jsonl")) {
          continue;
        }
        const filePath = path.join(dataDir, entry);
        const rows = readJsonl<Record<string, unknown>>(filePath).filter((row) => this.matchesTrace(record, row));
        for (const row of rows) {
          timeline.push({ source: entry, ...row });
        }
      }
    }

    return timeline.sort((left, right) => String(left.timestamp ?? left.updatedAt ?? "").localeCompare(String(right.timestamp ?? right.updatedAt ?? "")));
  }

  private matchesTrace(record: ClockchainCase, entry: Record<string, unknown>): boolean {
    const traceId = entry.traceId;
    const reqId = entry.reqId;
    const ctrId = entry.ctrId;
    const eid = entry.eid;
    return (
      traceId === record.traceContext.traceId ||
      reqId === record.traceContext.reqId ||
      ctrId === record.traceContext.ctrId ||
      (typeof eid === "string" && eid.length > 0 && eid === record.traceContext.eid)
    );
  }

  private buildDecisionKernel(record: ClockchainCase, trace?: ResolvedTrace): DecisionKernelAssessment {
    const resolvedTrace = trace ?? this.traceResolver.resolve(record.domain, record.traceContext.traceId);
    const readiness = this.getReleaseReadiness(record.domain);
    const basePolicy = decidePolicy(record.domain, record.intent);
    return assessDecisionKernel({
      record,
      trace: resolvedTrace,
      readiness,
      basePolicyClass: basePolicy.policyClass,
    });
  }

  private enrichCase(record: ClockchainCase): ClockchainCase {
    const trace = this.traceResolver.resolve(record.domain, record.traceContext.traceId);
    const traceContext = ensureTraceContext(trace, record.traceContext);
    const decisionKernel = this.buildDecisionKernel({ ...record, traceContext }, trace);
    const modelPacket = {
      ...buildModelPacket(record.domain, record.intent, record.severity, record.summary, record.input, traceContext),
      taxonomy: decisionKernel.taxonomy,
      kernel: {
        decision: decisionKernel.decision,
        zettelkastenRef: decisionKernel.zettelkastenRef,
        ntxTraceRef: decisionKernel.ntxTraceRef,
        blockedRoutes: decisionKernel.restrictedRoutes.filter((route) => route.status === "blocked").map((route) => route.id),
      },
    };

    return {
      ...record,
      traceContext,
      policyClass: decisionKernel.decision,
      modelPacket,
      modelExplanation: `${inferModelExplanation(record.domain, record.intent)} Decision kernel ${decisionKernel.kernelId} anchors the case in ${decisionKernel.zettelkastenRef} and ${decisionKernel.ntxTraceRef}, resulting in ${decisionKernel.decision}.`,
      decisionKernel,
    };
  }

  private async runAdapter(
    adapter: ExecutionAdapter,
    input: Record<string, unknown>,
    traceContext: TraceContext,
    mode: ExecutionMode,
    stepId: string,
    label: string
  ): Promise<{ result: ExecutionStepResult; refs: string[] }> {
    try {
      const output = await this.runtimeClient.request(adapter, input, traceContext, mode);
      return {
        result: {
          stepId,
          label,
          adapter: adapter.name,
          endpoint: adapter.endpoint,
          mode,
          status: "completed",
          output,
        },
        refs: adapter.extractRefs(output),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown adapter error";
      return {
        result: {
          stepId,
          label,
          adapter: adapter.name,
          endpoint: adapter.endpoint,
          mode,
          status: "failed",
          error: message,
        },
        refs: [],
      };
    }
  }

  private runDeployCommand(mode: ExecutionMode, input: Record<string, unknown>): { result: ExecutionStepResult; refs: string[] } {
    const network = String(input.network ?? "localhost");
    if (mode === "live" && process.env.ENABLE_CLOCKCHAIN_DEPLOY !== "1") {
      return {
        result: {
          stepId: "execute",
          label: "Run value-engine deployment script",
          adapter: "value_engine_deploy",
          mode,
          status: "failed",
          error: "Live deploy is disabled. Set ENABLE_CLOCKCHAIN_DEPLOY=1 to enable governed deployment.",
        },
        refs: [],
      };
    }

    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    const args =
      mode === "dry_run"
        ? ["hardhat", "compile"]
        : ["hardhat", "run", "scripts/deploy_value_engine.ts", "--network", network];
    const result = spawnSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      env: process.env,
    });

    const combinedOutput = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    const status = result.status === 0 ? "completed" : "failed";
    return {
      result: {
        stepId: mode === "dry_run" ? "dry_run" : "execute",
        label: mode === "dry_run" ? "Compile deployment path in dry-run mode" : "Run value-engine deployment script",
        adapter: "value_engine_deploy",
        mode,
        status,
        output: { command, args, network, stdout: result.stdout, stderr: result.stderr, exitCode: result.status },
        error: status === "failed" ? combinedOutput || "Deployment command failed" : undefined,
      },
      refs: status === "completed" ? buildRefList(network, combinedOutput ? combinedOutput : undefined) : [],
    };
  }

  private saveCaseSnapshot(record: ClockchainCase): ClockchainCase {
    const snapshot = this.enrichCase({
      ...record,
      version: record.version + 1,
      approvals: undefined,
      receipts: undefined,
    });
    this.store.saveCase(snapshot);
    return this.getCase(snapshot.id);
  }
}

export { OperatorAiError };
