import { ethers } from "ethers";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type TraceRefArray = string[];

export type TraceMetadataInput = {
  traceId?: string;
  reqId?: string;
  ctrId?: string;
  zkRefs?: TraceRefArray;
  evidenceRefs?: TraceRefArray;
};

export type CanonicalEventInput = {
  version?: number;
  eventType: string;
  actorWallet: string;
  timestamp?: string;
  payloadHash: string;
  vids?: string[];
  jurisdiction?: string;
  nonce?: string | number | null;
} & TraceMetadataInput & { [key: string]: JsonValue | undefined };

function normalizeStringArray(values?: TraceRefArray): TraceRefArray | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
  return normalized.length > 0 ? normalized : undefined;
}

function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, JsonValue>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, JsonValue>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function canonicalizeEvent(eventObj: Record<string, JsonValue>): string {
  return JSON.stringify(canonicalize(eventObj));
}

export function computeEID(canonicalEvent: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalEvent));
}

export function computeVID(data: Buffer | Uint8Array | string | JsonValue): string {
  const bytes =
    typeof data === "string"
      ? ethers.toUtf8Bytes(data)
      : Buffer.isBuffer(data) || data instanceof Uint8Array
        ? data
        : ethers.toUtf8Bytes(JSON.stringify(canonicalize(data)));
  return ethers.keccak256(bytes);
}

export function buildEventPacket(input: CanonicalEventInput) {
  const {
    version,
    eventType,
    actorWallet,
    timestamp,
    payloadHash,
    vids,
    jurisdiction,
    nonce,
    traceId,
    reqId,
    ctrId,
    zkRefs,
    evidenceRefs,
    ...extra
  } = input;

  const packet: Record<string, JsonValue> = {
    version: version ?? 1,
    eventType,
    actorWallet,
    timestamp: timestamp ?? new Date().toISOString(),
    payloadHash,
    vids: vids ?? [],
    jurisdiction: jurisdiction ?? "",
    nonce: nonce ?? null,
    ...(Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined)) as Record<
      string,
      JsonValue
    >),
  };

  if (traceId) {
    packet.traceId = traceId;
  }
  if (reqId) {
    packet.reqId = reqId;
  }
  if (ctrId) {
    packet.ctrId = ctrId;
  }

  const normalizedZkRefs = normalizeStringArray(zkRefs);
  const normalizedEvidenceRefs = normalizeStringArray(evidenceRefs);
  if (normalizedZkRefs) {
    packet.zkRefs = normalizedZkRefs;
  }
  if (normalizedEvidenceRefs) {
    packet.evidenceRefs = normalizedEvidenceRefs;
  }

  return packet;
}
