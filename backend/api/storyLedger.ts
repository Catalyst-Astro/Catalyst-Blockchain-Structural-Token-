import fs from "fs";
import path from "path";

export type StoryLedgerContext = {
  caseId?: string;
  traceId?: string;
  reqId?: string;
  ctrId?: string;
  eid?: string;
  vids?: string[];
  zkRefs?: string[];
  evidenceRefs?: string[];
  status?: string;
};

function normalizeStringArray(values?: string[]): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
  return normalized.length > 0 ? normalized : undefined;
}

export class StoryLedger {
  private filepath: string;

  constructor(
    filename?: string
  ) {
    this.filepath = filename ?? "";
    if (this.filepath) {
      this.ensureFilepath(this.filepath);
    }
  }

  private resolvePath(): string {
    const resolved = process.env.CATALYST_NARRATIVE_LEDGER_PATH ?? this.filepath;
    if (!resolved) {
      return path.join(process.cwd(), "narrative_memory", "narrative_ledger.jsonl");
    }
    return resolved;
  }

  private ensureFilepath(target: string): void {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, "");
    }
  }

  logAction(actor: string, action: string, context: StoryLedgerContext = {}) {
    const targetPath = this.resolvePath();
    this.ensureFilepath(targetPath);

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      actor,
      action,
    };

    if (context.traceId) entry.traceId = context.traceId;
    if (context.reqId) entry.reqId = context.reqId;
    if (context.ctrId) entry.ctrId = context.ctrId;
    if (context.caseId) entry.caseId = context.caseId;
    if (context.eid) entry.eid = context.eid;
    if (context.status) entry.status = context.status;

    const vids = normalizeStringArray(context.vids);
    const zkRefs = normalizeStringArray(context.zkRefs);
    const evidenceRefs = normalizeStringArray(context.evidenceRefs);
    if (vids) entry.vids = vids;
    if (zkRefs) entry.zkRefs = zkRefs;
    if (evidenceRefs) entry.evidenceRefs = evidenceRefs;

    fs.appendFileSync(targetPath, JSON.stringify(entry) + "\n", { encoding: "utf8" });
  }
}
