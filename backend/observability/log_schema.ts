import { appendJsonl, ensureFile, canonicalJson } from "../api/utils";
import path from "path";

export interface LogEvent {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  domain: string;
  correlationIds?: {
    eid?: string;
    vid?: string;
    rid?: string;
    batchId?: string;
    iid?: string;
  };
  message: string;
  dataHash?: string;
}

const logPath = path.join(process.cwd(), "backend", "database", "logs", "system.jsonl");
ensureFile(logPath);

export function logEvent(event: LogEvent) {
  const record = { ...event, canonical: canonicalJson(event) };
  appendJsonl(logPath, record);
}
