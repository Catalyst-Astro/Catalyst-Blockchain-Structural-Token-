import path from "path";
import { ethers } from "ethers";
import { appendJsonl, ensureFile, canonicalJson } from "../api/utils";
import { logEvent } from "../observability/log_schema";

const incidentsPath = path.join(process.cwd(), "backend", "database", "incidents.jsonl");
ensureFile(incidentsPath);

export interface IncidentInput {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  descriptionHash: string;
  correlationIds?: Record<string, string>;
}

export function createIncident(input: IncidentInput) {
  const payload = {
    ...input,
    createdAt: new Date().toISOString(),
  };
  const canonical = canonicalJson(payload);
  const iid = ethers.keccak256(ethers.toUtf8Bytes(canonical));
  appendJsonl(incidentsPath, { iid, ...payload, canonical });
  logEvent({
    timestamp: payload.createdAt,
    level: input.severity === "LOW" ? "INFO" : "WARN",
    domain: "incidents",
    correlationIds: { iid, ...(input.correlationIds || {}) },
    message: `incident ${input.type} severity=${input.severity}`,
    dataHash: input.descriptionHash,
  });
  return iid;
}

export function closeIncident(iid: string, resolutionHash: string) {
  appendJsonl(incidentsPath, {
    iid,
    action: "closed",
    resolutionHash,
    closedAt: new Date().toISOString(),
  });
  logEvent({
    timestamp: new Date().toISOString(),
    level: "INFO",
    domain: "incidents",
    correlationIds: { iid },
    message: `incident closed ${iid}`,
    dataHash: resolutionHash,
  });
}
