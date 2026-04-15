import path from "path";

import { readJsonl } from "./utils";

type JsonRecord = Record<string, unknown>;

export type EventTraceContextSummary = {
  traceId?: string;
  reqId?: string;
  ctrId?: string;
  zkRefs: string[];
  evidenceRefs: string[];
};

export type EventLifecycle = {
  status: string;
  createdAt?: string;
  lastAction?: string;
  lastTimestamp?: string;
  creator?: string;
  payloadHash?: string;
  vids: string[];
  attestCount?: number;
  verifyCount?: number;
};

export type EventTimelineEntry = {
  source: string;
  timestamp?: string;
  action?: string;
  status?: string;
  eid?: string;
  vids?: string[];
  traceId?: string;
  reqId?: string;
  ctrId?: string;
  zkRefs?: string[];
  evidenceRefs?: string[];
};

export type EventReadModel = {
  eid: string;
  logs: JsonRecord[];
  onChain: unknown | null;
  packet: Record<string, unknown> | null;
  traceContext: EventTraceContextSummary;
  lifecycle: EventLifecycle;
  timeline: EventTimelineEntry[];
};

type BuildEventReadModelInput = {
  eid: string;
  eventLogPath: string;
  storyLedgerPath?: string;
  onChain?: unknown | null;
};

const EVENT_STATUS_LABELS = ["none", "created", "attested", "verified", "rejected"] as const;

function resolveStoryLedgerPath(storyLedgerPath?: string) {
  return (
    storyLedgerPath ??
    process.env.CATALYST_NARRATIVE_LEDGER_PATH ??
    path.join(process.cwd(), "narrative_memory", "narrative_ledger.jsonl")
  );
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as JsonRecord;
}

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean))].sort();
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function toIsoTimestamp(value: unknown): string | undefined {
  const numeric = toNumber(value);
  if (numeric === undefined || numeric <= 0) {
    return undefined;
  }
  return new Date(numeric * 1000).toISOString();
}

function normalizeAction(action: string): string {
  const normalized = action.trim().toLowerCase();
  if (normalized.startsWith("create_event")) return "create";
  if (normalized.startsWith("attest_event")) return "attest";
  if (normalized.startsWith("verify_event")) return "verify";
  if (normalized.startsWith("reject_event")) return "reject";
  return normalized;
}

function statusFromAction(action?: string): string | undefined {
  switch (action) {
    case "create":
      return "created";
    case "attest":
      return "attested";
    case "verify":
      return "verified";
    case "reject":
      return "rejected";
    default:
      return undefined;
  }
}

function actionFromStatus(status?: string): string | undefined {
  switch (status) {
    case "created":
      return "create";
    case "attested":
      return "attest";
    case "verified":
      return "verify";
    case "rejected":
      return "reject";
    default:
      return undefined;
  }
}

function packetOf(entry: JsonRecord): Record<string, unknown> | null {
  const packet = asRecord(entry.packet);
  return packet ? (packet as Record<string, unknown>) : null;
}

function timestampOfEntry(entry: JsonRecord): string | undefined {
  const packet = packetOf(entry);
  return firstString(entry.timestamp, entry.updatedAt, packet?.timestamp);
}

function actionOfEntry(entry: JsonRecord): string | undefined {
  const explicitAction = firstString(entry.action);
  if (explicitAction) {
    return normalizeAction(explicitAction);
  }
  return packetOf(entry) ? "create" : undefined;
}

function statusOfEntry(entry: JsonRecord): string | undefined {
  const explicitStatus = firstString(entry.status);
  if (explicitStatus) {
    return explicitStatus.toLowerCase();
  }
  return statusFromAction(actionOfEntry(entry));
}

function traceIdOfEntry(entry: JsonRecord): string | undefined {
  return firstString(entry.traceId, packetOf(entry)?.traceId);
}

function reqIdOfEntry(entry: JsonRecord): string | undefined {
  return firstString(entry.reqId, packetOf(entry)?.reqId);
}

function ctrIdOfEntry(entry: JsonRecord): string | undefined {
  return firstString(entry.ctrId, packetOf(entry)?.ctrId);
}

function vidsOfEntry(entry: JsonRecord): string[] {
  const direct = normalizeStringArray(entry.vids);
  if (direct.length > 0) {
    return direct;
  }
  return normalizeStringArray(packetOf(entry)?.vids);
}

function zkRefsOfEntry(entry: JsonRecord): string[] {
  return [...new Set([...normalizeStringArray(entry.zkRefs), ...normalizeStringArray(packetOf(entry)?.zkRefs)])].sort();
}

function evidenceRefsOfEntry(entry: JsonRecord): string[] {
  return [...new Set([...normalizeStringArray(entry.evidenceRefs), ...normalizeStringArray(packetOf(entry)?.evidenceRefs)])].sort();
}

function eventStatusLabel(value: unknown): string | undefined {
  const numeric = toNumber(value);
  if (numeric !== undefined && Number.isInteger(numeric)) {
    return EVENT_STATUS_LABELS[numeric] ?? undefined;
  }
  return firstString(value)?.toLowerCase();
}

function buildTimelineEntry(entry: JsonRecord, source: string): EventTimelineEntry {
  const traceId = traceIdOfEntry(entry);
  const reqId = reqIdOfEntry(entry);
  const ctrId = ctrIdOfEntry(entry);
  const vids = vidsOfEntry(entry);
  const zkRefs = zkRefsOfEntry(entry);
  const evidenceRefs = evidenceRefsOfEntry(entry);
  const timelineEntry: EventTimelineEntry = {
    source,
    timestamp: timestampOfEntry(entry),
    action: actionOfEntry(entry),
    status: statusOfEntry(entry),
    eid: firstString(entry.eid),
    traceId,
    reqId,
    ctrId,
  };

  if (vids.length > 0) timelineEntry.vids = vids;
  if (zkRefs.length > 0) timelineEntry.zkRefs = zkRefs;
  if (evidenceRefs.length > 0) timelineEntry.evidenceRefs = evidenceRefs;

  return timelineEntry;
}

function compareTimeline(left: EventTimelineEntry, right: EventTimelineEntry) {
  return String(left.timestamp ?? "").localeCompare(String(right.timestamp ?? ""));
}

function inferTraceContext(logs: JsonRecord[], storyEntries: JsonRecord[], packet: Record<string, unknown> | null): EventTraceContextSummary {
  const candidates = [
    packet ?? {},
    ...logs,
    ...storyEntries,
  ];

  return {
    traceId: candidates.map((entry) => traceIdOfEntry(entry)).find((value): value is string => Boolean(value)),
    reqId: candidates.map((entry) => reqIdOfEntry(entry)).find((value): value is string => Boolean(value)),
    ctrId: candidates.map((entry) => ctrIdOfEntry(entry)).find((value): value is string => Boolean(value)),
    zkRefs: [...new Set(candidates.flatMap((entry) => zkRefsOfEntry(entry)))].sort(),
    evidenceRefs: [...new Set(candidates.flatMap((entry) => evidenceRefsOfEntry(entry)))].sort(),
  };
}

function inferLifecycle(
  logs: JsonRecord[],
  storyEntries: JsonRecord[],
  onChain: unknown | null,
  packet: Record<string, unknown> | null,
  timeline: EventTimelineEntry[]
): EventLifecycle {
  const onChainRecord = asRecord(onChain);
  const onChainStatus = eventStatusLabel(onChainRecord?.status);
  const storyTimeline = storyEntries.map((entry) => buildTimelineEntry(entry, "story_ledger")).sort(compareTimeline);
  const logTimeline = logs.map((entry) => buildTimelineEntry(entry, "events_log")).sort(compareTimeline);
  const lastStoryEntry = [...storyTimeline].reverse().find((entry) => entry.status || entry.action);
  const lastLogEntry = [...logTimeline].reverse().find((entry) => entry.status || entry.action);
  const createdLog = logs.find((entry) => packetOf(entry) !== null) ?? null;

  const status = onChainStatus ?? lastStoryEntry?.status ?? lastLogEntry?.status ?? "unknown";
  const createdAt =
    toIsoTimestamp(onChainRecord?.createdAt) ??
    firstString(packet?.timestamp, createdLog ? timestampOfEntry(createdLog) : undefined);
  const lastAction =
    onChainStatus
      ? actionFromStatus(onChainStatus) ?? lastStoryEntry?.action ?? lastLogEntry?.action
      : lastStoryEntry?.action ?? lastLogEntry?.action;
  const lastTimestamp =
    timeline.length > 0 ? timeline[timeline.length - 1]?.timestamp : toIsoTimestamp(onChainRecord?.createdAt);
  const creator = firstString(onChainRecord?.creator, packet?.actorWallet);
  const payloadHash = firstString(onChainRecord?.payloadHash, createdLog?.payloadHash, packet?.payloadHash);
  const onChainVids = normalizeStringArray(onChainRecord?.vids);
  const fallbackVids = createdLog ? vidsOfEntry(createdLog) : normalizeStringArray(packet?.vids);
  const derivedAttestCount = storyTimeline.filter((entry) => entry.action === "attest").length;
  const derivedVerifyCount = storyTimeline.filter((entry) => entry.action === "verify").length;
  const lifecycle: EventLifecycle = {
    status,
    vids: onChainVids.length > 0 ? onChainVids : fallbackVids,
  };

  if (createdAt) lifecycle.createdAt = createdAt;
  if (lastAction) lifecycle.lastAction = lastAction;
  if (lastTimestamp) lifecycle.lastTimestamp = lastTimestamp;
  if (creator) lifecycle.creator = creator;
  if (payloadHash) lifecycle.payloadHash = payloadHash;

  const onChainAttestCount = toNumber(onChainRecord?.attestCount);
  const onChainVerifyCount = toNumber(onChainRecord?.verifyCount);
  if (onChainAttestCount !== undefined) lifecycle.attestCount = onChainAttestCount;
  else if (derivedAttestCount > 0) lifecycle.attestCount = derivedAttestCount;
  if (onChainVerifyCount !== undefined) lifecycle.verifyCount = onChainVerifyCount;
  else if (derivedVerifyCount > 0) lifecycle.verifyCount = derivedVerifyCount;

  return lifecycle;
}

export function buildEventReadModel(input: BuildEventReadModelInput): EventReadModel {
  const logs = readJsonl<JsonRecord>(input.eventLogPath).filter((entry) => firstString(entry.eid) === input.eid);
  const packetRecord = logs.map((entry) => packetOf(entry)).find((entry): entry is Record<string, unknown> => entry !== null) ?? null;

  const initialStoryEntries = readJsonl<JsonRecord>(resolveStoryLedgerPath(input.storyLedgerPath)).filter(
    (entry) => firstString(entry.eid) === input.eid
  );
  const traceIds = new Set<string>(
    [packetRecord ?? {}, ...logs, ...initialStoryEntries].map((entry) => traceIdOfEntry(entry)).filter((value): value is string => Boolean(value))
  );
  const reqIds = new Set<string>(
    [packetRecord ?? {}, ...logs, ...initialStoryEntries].map((entry) => reqIdOfEntry(entry)).filter((value): value is string => Boolean(value))
  );
  const ctrIds = new Set<string>(
    [packetRecord ?? {}, ...logs, ...initialStoryEntries].map((entry) => ctrIdOfEntry(entry)).filter((value): value is string => Boolean(value))
  );

  const storyEntries = readJsonl<JsonRecord>(resolveStoryLedgerPath(input.storyLedgerPath)).filter((entry) => {
    const entryEid = firstString(entry.eid);
    const entryTraceId = traceIdOfEntry(entry);
    const entryReqId = reqIdOfEntry(entry);
    const entryCtrId = ctrIdOfEntry(entry);
    return (
      entryEid === input.eid ||
      (entryTraceId !== undefined && traceIds.has(entryTraceId)) ||
      (entryReqId !== undefined && reqIds.has(entryReqId)) ||
      (entryCtrId !== undefined && ctrIds.has(entryCtrId))
    );
  });

  const traceContext = inferTraceContext(logs, storyEntries, packetRecord);
  const timeline = [
    ...logs.map((entry) => buildTimelineEntry(entry, "events_log")),
    ...storyEntries.map((entry) => buildTimelineEntry(entry, "story_ledger")),
  ].sort(compareTimeline);

  return {
    eid: input.eid,
    logs,
    onChain: input.onChain ?? null,
    packet: packetRecord,
    traceContext,
    lifecycle: inferLifecycle(logs, storyEntries, input.onChain ?? null, packetRecord, timeline),
    timeline,
  };
}

export function findRelatedEventIdsByVid(vid: string, eventLogPath: string, storyLedgerPath?: string): string[] {
  const eventIds = new Set<string>();
  const eventLogs = readJsonl<JsonRecord>(eventLogPath);
  for (const entry of eventLogs) {
    const entryEid = firstString(entry.eid);
    if (!entryEid) {
      continue;
    }
    if (vidsOfEntry(entry).includes(vid)) {
      eventIds.add(entryEid);
    }
  }

  const storyEntries = readJsonl<JsonRecord>(resolveStoryLedgerPath(storyLedgerPath));
  for (const entry of storyEntries) {
    const entryEid = firstString(entry.eid);
    const action = firstString(entry.action)?.toLowerCase();
    const actor = firstString(entry.actor)?.toLowerCase();
    if (!entryEid || (!action?.includes("event") && actor !== "event")) {
      continue;
    }
    if (normalizeStringArray(entry.vids).includes(vid)) {
      eventIds.add(entryEid);
    }
  }

  return [...eventIds].sort();
}
