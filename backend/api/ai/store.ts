import path from "path";

import { appendJsonl, ensureFile, readJsonl } from "../utils";
import type { ApprovalRequest, CaseReport, ClockchainCase, ExecutionReceipt } from "./types";

export class ClockchainCaseStore {
  public readonly baseDir: string;
  private readonly casesPath: string;
  private readonly approvalsPath: string;
  private readonly receiptsPath: string;
  private readonly reportsPath: string;

  constructor(
    baseDir = process.env.CATALYST_DATA_DIR
      ? path.resolve(process.env.CATALYST_DATA_DIR)
      : path.join(process.cwd(), "backend", "database")
  ) {
    this.baseDir = baseDir;
    this.casesPath = path.join(this.baseDir, "ai_cases.jsonl");
    this.approvalsPath = path.join(this.baseDir, "ai_approvals.jsonl");
    this.receiptsPath = path.join(this.baseDir, "ai_execution_receipts.jsonl");
    this.reportsPath = path.join(this.baseDir, "ai_reports.jsonl");

    ensureFile(this.casesPath);
    ensureFile(this.approvalsPath);
    ensureFile(this.receiptsPath);
    ensureFile(this.reportsPath);
  }

  listCases(): ClockchainCase[] {
    return [...this.readLatestCaseMap().values()]
      .map((entry) => this.hydrateCase(entry))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getCase(caseId: string): ClockchainCase | null {
    const snapshot = this.readLatestCaseMap().get(caseId);
    return snapshot ? this.hydrateCase(snapshot) : null;
  }

  getCaseSnapshot(caseId: string): ClockchainCase | null {
    const snapshot = this.readLatestCaseMap().get(caseId);
    return snapshot ? { ...snapshot } : null;
  }

  saveCase(record: ClockchainCase): ClockchainCase {
    appendJsonl(this.casesPath, record);
    return this.hydrateCase(record);
  }

  saveApproval(record: ApprovalRequest): ApprovalRequest {
    appendJsonl(this.approvalsPath, record);
    return record;
  }

  saveReceipt(record: ExecutionReceipt): ExecutionReceipt {
    appendJsonl(this.receiptsPath, record);
    return record;
  }

  saveReport(record: CaseReport): CaseReport {
    appendJsonl(this.reportsPath, record);
    return record;
  }

  listApprovals(caseId: string): ApprovalRequest[] {
    return readJsonl<ApprovalRequest>(this.approvalsPath)
      .filter((record) => record.caseId === caseId)
      .sort((left, right) => left.decidedAt.localeCompare(right.decidedAt));
  }

  listReceipts(caseId: string): ExecutionReceipt[] {
    return readJsonl<ExecutionReceipt>(this.receiptsPath)
      .filter((record) => record.caseId === caseId)
      .sort((left, right) => left.completedAt.localeCompare(right.completedAt));
  }

  getReport(caseId: string): CaseReport | null {
    const reports = readJsonl<CaseReport>(this.reportsPath).filter((record) => record.caseId === caseId);
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }

  private readLatestCaseMap(): Map<string, ClockchainCase> {
    const snapshots = readJsonl<ClockchainCase>(this.casesPath);
    const out = new Map<string, ClockchainCase>();
    for (const snapshot of snapshots) {
      if (!snapshot?.id) {
        continue;
      }
      const existing = out.get(snapshot.id);
      if (!existing || existing.version <= snapshot.version) {
        out.set(snapshot.id, { ...snapshot });
      }
    }
    return out;
  }

  private hydrateCase(snapshot: ClockchainCase): ClockchainCase {
    return {
      ...snapshot,
      approvals: this.listApprovals(snapshot.id),
      receipts: this.listReceipts(snapshot.id),
      report: this.getReport(snapshot.id) ?? snapshot.report,
    };
  }
}
