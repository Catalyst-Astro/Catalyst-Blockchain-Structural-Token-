import { ethers } from "ethers";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

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

export function computeVID(data: Buffer | string): string {
  const bytes = typeof data === "string" ? ethers.toUtf8Bytes(data) : data;
  return ethers.keccak256(bytes);
}

export function buildEventPacket(input: {
  version?: number;
  eventType: string;
  actorWallet: string;
  timestamp?: string;
  payloadHash: string;
  vids?: string[];
  jurisdiction?: string;
  nonce?: string | number;
  [key: string]: JsonValue;
}) {
  const packet = {
    version: input.version ?? 1,
    eventType: input.eventType,
    actorWallet: input.actorWallet,
    timestamp: input.timestamp ?? new Date().toISOString(),
    payloadHash: input.payloadHash,
    vids: input.vids ?? [],
    jurisdiction: input.jurisdiction ?? "",
    nonce: input.nonce ?? null,
    ...input,
  };
  return packet;
}
