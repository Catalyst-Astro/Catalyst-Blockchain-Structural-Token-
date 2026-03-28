import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import { appendJsonl, ensureFile, hashCanonical, readJsonl } from "../utils";
import { ClockchainTraceResolver } from "./traceability";

export type UiSurface = "dashboard" | "operator" | "settings";
export type UiCopilotIntent =
  | "surface_review"
  | "component_brief"
  | "layout_proposal"
  | "a11y_audit"
  | "design_regression";
export type UiCaseStatus = "open" | "planned" | "reviewed";

export type UiProposal = {
  tokens: string[];
  layoutChanges: string[];
  componentChanges: string[];
  a11yChecks: string[];
  acceptanceCriteria: string[];
};

export type UiReviewReport = {
  id: string;
  caseId: string;
  generatedAt: string;
  summary: string;
  recommendations: string[];
  regressions: string[];
  screenshots: string[];
  evidenceRefs: string[];
  zkRefs: string[];
  traceId?: string;
  proposal: UiProposal;
};

export type UiCopilotCase = {
  id: string;
  requester: string;
  surface: UiSurface;
  intent: UiCopilotIntent;
  summary: string;
  status: UiCaseStatus;
  traceId?: string;
  zkRefs: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
  modelPacket: Record<string, unknown>;
  modelExplanation: string;
  proposal?: UiProposal;
  report?: UiReviewReport;
};

export type CreateUiCaseInput = {
  requester: string;
  summary: string;
  surface?: UiSurface;
  intent?: UiCopilotIntent;
  input?: Record<string, unknown>;
};

class UiCopilotError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

class UiCopilotStore {
  private readonly baseDir: string;
  private readonly casesPath: string;
  private readonly reportsPath: string;
  private readonly reviewEvidencePath: string;

  constructor(
    baseDir = process.env.CATALYST_DATA_DIR
      ? path.resolve(process.env.CATALYST_DATA_DIR)
      : path.join(process.cwd(), "backend", "database")
  ) {
    this.baseDir = baseDir;
    this.casesPath = path.join(this.baseDir, "ui_cases.jsonl");
    this.reportsPath = path.join(this.baseDir, "ui_reports.jsonl");
    this.reviewEvidencePath = path.join(this.baseDir, "ui_reviews.jsonl");

    ensureFile(this.casesPath);
    ensureFile(this.reportsPath);
    ensureFile(this.reviewEvidencePath);
  }

  listCases(): UiCopilotCase[] {
    return [...this.readLatestCaseMap().values()]
      .map((entry) => this.hydrateCase(entry))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getCase(caseId: string): UiCopilotCase | null {
    const snapshot = this.readLatestCaseMap().get(caseId);
    return snapshot ? this.hydrateCase(snapshot) : null;
  }

  saveCase(record: UiCopilotCase): UiCopilotCase {
    appendJsonl(this.casesPath, record);
    return this.hydrateCase(record);
  }

  saveReport(record: UiReviewReport): UiReviewReport {
    appendJsonl(this.reportsPath, record);
    appendJsonl(this.reviewEvidencePath, record);
    return record;
  }

  getReport(caseId: string): UiReviewReport | null {
    const reports = readJsonl<UiReviewReport>(this.reportsPath).filter((entry) => entry.caseId === caseId);
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }

  getEvidencePath(): string {
    return this.reviewEvidencePath;
  }

  private readLatestCaseMap(): Map<string, UiCopilotCase> {
    const snapshots = readJsonl<UiCopilotCase>(this.casesPath);
    const out = new Map<string, UiCopilotCase>();
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

  private hydrateCase(snapshot: UiCopilotCase): UiCopilotCase {
    return {
      ...snapshot,
      report: this.getReport(snapshot.id) ?? snapshot.report,
    };
  }
}

const REDACTED_KEYS = new Set(["payload", "mock", "token", "apikey", "privatekey", "email"]);

function normalizeStringArray(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function sanitizeSummary(summary: string): string {
  return summary
    .replace(/0x[a-fA-F0-9]{40,}/g, "[ADDRESS]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]");
}

function redactValue(value: unknown, parentKey = ""): unknown {
  if (REDACTED_KEYS.has(parentKey.toLowerCase())) {
    return `[REDACTED:${hashCanonical(value).slice(2, 10)}]`;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, parentKey));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
      acc[key] = redactValue(entry, key);
      return acc;
    }, {});
  }

  return value;
}

function inferSurface(summary: string, input: Record<string, unknown>): UiSurface {
  const source = `${summary} ${JSON.stringify(input)}`.toLowerCase();
  if (source.includes("setting") || source.includes("slack") || source.includes("theme") || source.includes("notification")) {
    return "settings";
  }
  if (source.includes("operator") || source.includes("approval") || source.includes("case")) {
    return "operator";
  }
  return "dashboard";
}

function inferIntent(intent: UiCopilotIntent | undefined, summary: string, input: Record<string, unknown>): UiCopilotIntent {
  if (intent) {
    return intent;
  }
  const source = `${summary} ${JSON.stringify(input)}`.toLowerCase();
  if (source.includes("a11y") || source.includes("accessibility")) {
    return "a11y_audit";
  }
  if (source.includes("regression")) {
    return "design_regression";
  }
  if (source.includes("layout")) {
    return "layout_proposal";
  }
  if (source.includes("component")) {
    return "component_brief";
  }
  return "surface_review";
}

function buildUiModelPacket(
  surface: UiSurface,
  intent: UiCopilotIntent,
  summary: string,
  input: Record<string, unknown>,
  traceId: string | undefined,
  zkRefs: string[]
): Record<string, unknown> {
  return {
    surface,
    intent,
    summary: sanitizeSummary(summary),
    input: redactValue(input),
    traceId,
    zkRefs,
    constraints: [
      "ui copilot is governed and never publishes directly to main",
      "all proposals must preserve ZK to NTX trace continuity",
      "renderer smoke tests and accessibility checks gate the proposal",
    ],
  };
}

function buildSurfaceContract(surface: UiSurface) {
  switch (surface) {
    case "operator":
      return {
        tokens: ["--primary", "--card", "--border"],
        layoutChanges: [
          "Keep the case list and case detail separated into operator and audit lanes.",
          "Preserve a strong visual break between approvals, execution, and report detail.",
        ],
        componentChanges: [
          "Retain the approval inbox table as the operator intake surface.",
          "Keep decision-kernel metadata visible inside the detail panel.",
        ],
        a11yChecks: [
          "Buttons for plan, approve, dry run, and live execute must remain keyboard reachable.",
          "Case rows must keep a visible selected state and focus ring.",
        ],
        acceptanceCriteria: [
          "Operator state changes remain readable in loading, empty, error, and ready states.",
          "No approval action becomes visually primary when approval is not available.",
        ],
      };
    case "settings":
      return {
        tokens: ["--bg", "--fg", "--muted"],
        layoutChanges: [
          "Keep environment, notification, and theme controls grouped by operational responsibility.",
          "Use short helper text under each toggle to keep activation steps self-explanatory.",
        ],
        componentChanges: [
          "Preserve theme and notification controls as explicit cards, not collapsed menus.",
          "Expose activation commands and backend URL status in the same page.",
        ],
        a11yChecks: [
          "All toggle actions need visible labels and helper text.",
          "The settings page must be fully usable without pointer hover.",
        ],
        acceptanceCriteria: [
          "A new operator can identify theme, notifications, and activation commands within one screen.",
          "Disabled or missing integrations are explained in plain language.",
        ],
      };
    case "dashboard":
    default:
      return {
        tokens: ["--primary", "--card", "--radius"],
        layoutChanges: [
          "Keep hero, KPI band, and operational ledger in a strict top-down scan path.",
          "Maintain a single critical-focus card that surfaces the most urgent operation.",
        ],
        componentChanges: [
          "Preserve KPI tiles as the fastest scan surface for portfolio health.",
          "Keep the operations ledger searchable and filterable without modal navigation.",
        ],
        a11yChecks: [
          "Search and status controls need explicit labels and focus visibility.",
          "Error and empty states must remain readable without relying on color alone.",
        ],
        acceptanceCriteria: [
          "The dashboard remains legible at laptop width without horizontal scrolling.",
          "The first-run empty state still exposes a clear create-operation action.",
        ],
      };
  }
}

function buildProposal(surface: UiSurface, intent: UiCopilotIntent): UiProposal {
  const base = buildSurfaceContract(surface);
  const tokens = [...base.tokens];
  const layoutChanges = [...base.layoutChanges];
  const componentChanges = [...base.componentChanges];
  const a11yChecks = [...base.a11yChecks];
  const acceptanceCriteria = [...base.acceptanceCriteria];

  switch (intent) {
    case "component_brief":
      componentChanges.push("Document the target component contract before any visual rewrite.");
      acceptanceCriteria.push("The proposal names affected components and the intended user action for each.");
      break;
    case "layout_proposal":
      layoutChanges.push("State the intended visual rhythm, density, and breakpoint behavior explicitly.");
      acceptanceCriteria.push("The proposal defines desktop and mobile layout expectations.");
      break;
    case "a11y_audit":
      a11yChecks.push("Verify heading order, semantic tables, and aria labels on primary actions.");
      acceptanceCriteria.push("All primary actions can be completed by keyboard and screen-reader labels stay meaningful.");
      break;
    case "design_regression":
      componentChanges.push("Compare screenshots and spot hierarchy drift before accepting the proposal.");
      acceptanceCriteria.push("No regression is accepted without updated screenshot evidence.");
      break;
    case "surface_review":
    default:
      acceptanceCriteria.push("The review leaves a small set of high-signal UI actions instead of an open-ended redesign.");
      break;
  }

  return {
    tokens: normalizeStringArray(tokens),
    layoutChanges: normalizeStringArray(layoutChanges),
    componentChanges: normalizeStringArray(componentChanges),
    a11yChecks: normalizeStringArray(a11yChecks),
    acceptanceCriteria: normalizeStringArray(acceptanceCriteria),
  };
}

function renderMarkdownReport(record: UiCopilotCase, report: UiReviewReport): string {
  return [
    `# UI Copilot Report`,
    ``,
    `- Case: \`${record.id}\``,
    `- Surface: \`${record.surface}\``,
    `- Intent: \`${record.intent}\``,
    `- Trace: \`${report.traceId ?? "GUI-001"}\``,
    `- ZK: ${report.zkRefs.map((entry) => `\`${entry}\``).join(", ")}`,
    ``,
    `## Summary`,
    report.summary,
    ``,
    `## Recommendations`,
    ...report.recommendations.map((entry) => `- ${entry}`),
    ``,
    `## Regressions`,
    ...(report.regressions.length > 0 ? report.regressions.map((entry) => `- ${entry}`) : ["- No active regressions detected."]),
    ``,
    `## Evidence`,
    ...report.evidenceRefs.map((entry) => `- \`${entry}\``),
  ].join("\n");
}

export class ClockchainUiCopilot {
  private readonly store: UiCopilotStore;
  private readonly traceResolver: ClockchainTraceResolver;
  private readonly artifactsDir: string;

  constructor(options: { store?: UiCopilotStore; traceResolver?: ClockchainTraceResolver } = {}) {
    this.store = options.store ?? new UiCopilotStore();
    this.traceResolver = options.traceResolver ?? new ClockchainTraceResolver();
    this.artifactsDir = path.join(process.cwd(), "artifacts", "gui", "reports");
  }

  listCases(): UiCopilotCase[] {
    return this.store.listCases();
  }

  getCase(caseId: string): UiCopilotCase {
    const record = this.store.getCase(caseId);
    if (!record) {
      throw new UiCopilotError(404, `UI case ${caseId} not found`);
    }
    return record;
  }

  createCase(input: CreateUiCaseInput): UiCopilotCase {
    if (!input.requester || !input.summary) {
      throw new UiCopilotError(400, "requester and summary are required");
    }

    const normalizedInput = input.input && typeof input.input === "object" ? input.input : {};
    const surface = input.surface ?? inferSurface(input.summary, normalizedInput);
    const intent = inferIntent(input.intent, input.summary, normalizedInput);
    const trace = this.traceResolver.resolve("GUI" as never);
    const now = new Date().toISOString();
    const record: UiCopilotCase = {
      id: `ui-case-${randomUUID()}`,
      requester: input.requester,
      surface,
      intent,
      summary: input.summary,
      status: "open",
      traceId: trace.traceId,
      zkRefs: normalizeStringArray(["ZK-GUI-001", ...trace.zkRefs]),
      createdAt: now,
      updatedAt: now,
      version: 1,
      modelPacket: buildUiModelPacket(surface, intent, input.summary, normalizedInput, trace.traceId, normalizeStringArray(["ZK-GUI-001", ...trace.zkRefs])),
      modelExplanation:
        "The UI copilot is governed: it anchors proposals in ZK/NTX, emits acceptance criteria, and never publishes directly to main.",
    };

    return this.store.saveCase(record);
  }

  generatePlan(caseId: string): UiCopilotCase {
    const record = this.getCase(caseId);
    const proposal = buildProposal(record.surface, record.intent);
    return this.store.saveCase({
      ...record,
      status: "planned",
      updatedAt: new Date().toISOString(),
      version: record.version + 1,
      proposal,
    });
  }

  buildReport(caseId: string): UiReviewReport {
    const record = this.getCase(caseId);
    const trace = this.traceResolver.resolve("GUI" as never, record.traceId);
    const readiness = this.traceResolver.getReleaseReadiness("GUI" as never);
    const proposal = record.proposal ?? buildProposal(record.surface, record.intent);
    const screenshotPath = path.posix.join("artifacts", "gui", "screenshots", `${record.surface}.png`);
    const markdownPath = path.join(this.artifactsDir, `${record.id}.md`);
    const jsonPath = path.join(this.artifactsDir, `${record.id}.json`);
    const regressions = [
      ...(fs.existsSync(path.join(process.cwd(), screenshotPath)) ? [] : [`Missing screenshot artifact for ${record.surface}.`]),
      ...(readiness.errors.length > 0 ? readiness.errors.map((entry) => `Traceability drift: ${entry}`) : []),
    ];
    const report: UiReviewReport = {
      id: `ui-report-${randomUUID()}`,
      caseId: record.id,
      generatedAt: new Date().toISOString(),
      summary: `${record.surface} ${record.intent} stays anchored to ${trace.traceId ?? "GUI-001"} and proposes a governed UI iteration path.`,
      recommendations: [
        "Review the proposal before any renderer change is merged.",
        "Re-run renderer smoke tests and artifact capture after implementing the visual delta.",
        "Keep ZK-GUI-001 and TR#GUI-001 aligned with the actual surface contract.",
      ],
      regressions: normalizeStringArray(regressions),
      screenshots: [screenshotPath],
      evidenceRefs: normalizeStringArray([
        path.relative(process.cwd(), this.store.getEvidencePath()).replace(/\\/g, "/"),
        path.relative(process.cwd(), markdownPath).replace(/\\/g, "/"),
        path.relative(process.cwd(), jsonPath).replace(/\\/g, "/"),
        screenshotPath,
        ...trace.evidenceRefs,
      ]),
      zkRefs: normalizeStringArray(["ZK-GUI-001", ...trace.zkRefs]),
      traceId: trace.traceId,
      proposal,
    };

    fs.mkdirSync(this.artifactsDir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
    fs.writeFileSync(markdownPath, renderMarkdownReport(record, report), "utf8");
    this.store.saveReport(report);
    this.store.saveCase({
      ...record,
      status: "reviewed",
      updatedAt: report.generatedAt,
      version: record.version + 1,
      proposal,
      report,
    });
    return report;
  }
}

export { UiCopilotError };
