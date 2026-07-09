import type { CaseSeverity, CaseRole, ClockchainDomain, ClockchainIntent, PolicyClass } from "./types";

export type PolicyDecision = {
  policyClass: PolicyClass;
  requiresApproval: boolean;
  approverRole: CaseRole;
  rationale: string;
};

const READ_ONLY_INTENTS = new Set<ClockchainIntent>(["release_readiness", "deploy_readiness", "audit_event", "trace_audit"]);
const PROPOSE_ONLY_INTENTS = new Set<ClockchainIntent>(["incident_settlement"]);
const IRREVERSIBLE_INTENTS = new Set<ClockchainIntent>([
  "deploy",
  "verify_event",
  "reject_event",
  "revoke_identity",
  "revoke_credential",
  "cash_in_confirm",
  "cash_out_confirm",
]);

export function decidePolicy(domain: ClockchainDomain, intent: ClockchainIntent): PolicyDecision {
  if (READ_ONLY_INTENTS.has(intent)) {
    return {
      policyClass: "read_only",
      requiresApproval: false,
      approverRole: "approver",
      rationale: `${domain} ${intent} only reads traces, metrics, or readiness state.`,
    };
  }

  if (PROPOSE_ONLY_INTENTS.has(intent)) {
    return {
      policyClass: "propose_only",
      requiresApproval: false,
      approverRole: "approver",
      rationale: `${domain} ${intent} produces operational guidance without mutating runtime state.`,
    };
  }

  if (IRREVERSIBLE_INTENTS.has(intent)) {
    return {
      policyClass: "irreversible_execute",
      requiresApproval: true,
      approverRole: "approver",
      rationale: `${domain} ${intent} changes regulated runtime state and stays gated by AX12.`,
    };
  }

  return {
    policyClass: "reversible_execute",
    requiresApproval: false,
    approverRole: "approver",
    rationale: `${domain} ${intent} can be staged through dry-run and governed adapters.`,
  };
}

export function inferSeverity(domain: ClockchainDomain, intent: ClockchainIntent, summary: string): CaseSeverity {
  const normalized = summary.toLowerCase();
  if (
    normalized.includes("incident") ||
    normalized.includes("outage") ||
    normalized.includes("blocked") ||
    IRREVERSIBLE_INTENTS.has(intent)
  ) {
    return domain === "RMP" || domain === "VAL" ? "critical" : "high";
  }

  if (domain === "IDC" || domain === "EVT") {
    return "medium";
  }

  return "low";
}
