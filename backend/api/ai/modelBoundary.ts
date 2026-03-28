import { hashCanonical } from "../utils";
import type { ClockchainDomain, ClockchainIntent } from "./types";

const SENSITIVE_KEYS = new Set([
  "wallet",
  "privatekey",
  "identitypacket",
  "credentialpacket",
  "paymentref",
  "payoutref",
  "payload",
  "scoringinput",
  "confirmation",
  "email",
  "phone",
  "address",
  "firstname",
  "lastname",
  "fullname",
]);

function redactScalar(value: unknown): string {
  return `[REDACTED:${hashCanonical(value).slice(2, 10)}]`;
}

function sanitizeSummary(summary: string): string {
  return summary
    .replace(/0x[a-fA-F0-9]{40,}/g, "[ADDRESS]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]");
}

export function redactForModel(value: unknown, parentKey = ""): unknown {
  const normalizedKey = parentKey.toLowerCase();
  if (SENSITIVE_KEYS.has(normalizedKey)) {
    return redactScalar(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactForModel(entry, parentKey));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
      acc[key] = redactForModel(entry, key);
      return acc;
    }, {});
  }

  if (typeof value === "string" && /0x[a-fA-F0-9]{40,}/.test(value)) {
    return "[ADDRESS]";
  }

  return value;
}

export function buildModelPacket(
  domain: ClockchainDomain,
  intent: ClockchainIntent,
  severity: string,
  summary: string,
  input: Record<string, unknown>,
  traceHints: Record<string, unknown>
): Record<string, unknown> {
  return {
    domain,
    intent,
    severity,
    summary: sanitizeSummary(summary),
    input: redactForModel(input),
    traceHints: redactForModel(traceHints),
    constraints: [
      "external models never receive raw keys or regulated evidence",
      "all execution remains in deterministic adapters",
      "approval required for irreversible actions",
    ],
  };
}

export function inferModelExplanation(domain: ClockchainDomain, intent: ClockchainIntent): string {
  const domainLabel =
    domain === "VAL"
      ? "value engine"
      : domain === "EVT"
        ? "event traceability"
        : domain === "IDC"
          ? "identity and compliance"
          : "ramp settlement";

  return `The redacted case packet maps to ${domainLabel} with intent ${intent}; operate through trace resolution, policy gate, dry-run, evidence capture, and human approval when AX12 applies.`;
}
