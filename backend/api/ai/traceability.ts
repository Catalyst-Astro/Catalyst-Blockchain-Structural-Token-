import fs from "fs";
import path from "path";

import type { ClockchainDomain, ResolvedTrace } from "./types";

type ParsedNode = {
  id: string;
  kind: string;
  domain: string | null;
  file: string;
  line: number;
  zref: string | null;
};

type ParsedTrace = {
  id: string;
  domain: string | null;
  refs: Record<string, string[]>;
  coverage: string;
  file: string;
  line: number;
};

type ZettelkastenNote = {
  id: string;
  domain: string;
  kind: string;
  layer: string;
  ntRefs: string[];
  artifactRefs: string[];
  testRefs: string[];
  metricRefs: string[];
  evidenceRefs: string[];
  conflicts: string[];
};

const validatorModule = require(path.join(process.cwd(), "scripts", "clockchain", "validate-ntx.js")) as {
  listNtxFiles: (rootDir: string) => string[];
  parseGraph: (files: string[]) => { nodes: Map<string, ParsedNode>; traces: ParsedTrace[] };
  runValidation: (rootDir?: string) => {
    coverageByDomain: Record<string, { coverageRatio: number }>;
    errors: string[];
    criticalFailures: string[];
    latestEvidenceRecorded: { file: string } | null;
  };
};

function parseFrontmatter(content: string): Record<string, string | string[]> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const data: Record<string, string | string[]> = {};
  let currentListKey: string | null = null;
  for (const line of match[1].split(/\r?\n/)) {
    const listMatch = line.match(/^\s*-\s*(.+)\s*$/);
    if (currentListKey && listMatch) {
      const bucket = data[currentListKey];
      if (Array.isArray(bucket)) {
        bucket.push(listMatch[1]);
      }
      continue;
    }

    const entryMatch = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!entryMatch) {
      currentListKey = null;
      continue;
    }

    const [, key, rawValue] = entryMatch;
    if (!rawValue) {
      data[key] = [];
      currentListKey = key;
      continue;
    }

    if (rawValue === "[]") {
      data[key] = [];
      currentListKey = null;
      continue;
    }

    data[key] = rawValue;
    currentListKey = null;
  }

  return data;
}

export class ClockchainTraceResolver {
  private readonly ntxRootDir: string;
  private readonly notesDir: string;

  constructor(
    ntxRootDir = path.join(process.cwd(), "docs", "clockchain", "ntx"),
    notesDir = path.join(process.cwd(), "docs", "clockchain", "zettelkasten", "notes")
  ) {
    this.ntxRootDir = ntxRootDir;
    this.notesDir = notesDir;
  }

  resolve(domain: ClockchainDomain, traceId?: string): ResolvedTrace {
    const graph = this.loadGraph();
    const notes = this.loadNotes().filter((note) => note.domain === domain);
    const traces = graph.traces.filter((entry) => entry.domain === domain);
    const selectedTrace = traceId
      ? traces.find((entry) => entry.id === traceId) ?? traces[0]
      : traces[0];

    const reqId = selectedTrace?.refs.Req?.[0] ?? notes.flatMap((note) => note.ntRefs).find((id) => id.startsWith("REQ-"));
    const ctrId =
      selectedTrace?.refs.Design?.find((id) => graph.nodes.get(id)?.kind === "CTR") ??
      notes.flatMap((note) => note.ntRefs).find((id) => id.startsWith("CTR-"));

    const traceNodeIds = selectedTrace ? Object.values(selectedTrace.refs).flat() : [];
    const nodesByStage = selectedTrace?.refs ?? {};
    const zkRefs = [...new Set([
      ...notes.map((note) => note.id),
      ...traceNodeIds.map((id) => graph.nodes.get(id)?.zref).filter((entry): entry is string => Boolean(entry)),
    ])].sort();

    return {
      traceId: selectedTrace?.id,
      domain,
      reqId,
      ctrId,
      zkRefs,
      evidenceRefs: [...new Set(notes.flatMap((note) => note.evidenceRefs))].sort(),
      artifacts: [...new Set(notes.flatMap((note) => note.artifactRefs))].sort(),
      tests: [...new Set(notes.flatMap((note) => note.testRefs))].sort(),
      metrics: [...new Set(notes.flatMap((note) => note.metricRefs))].sort(),
      notes: notes.map((note) => ({
        id: note.id,
        kind: note.kind,
        layer: note.layer,
        artifactRefs: note.artifactRefs,
        testRefs: note.testRefs,
        metricRefs: note.metricRefs,
        evidenceRefs: note.evidenceRefs,
        conflicts: note.conflicts,
      })),
      nodesByStage,
      candidateTraces: traces.map((entry) => entry.id).sort(),
    };
  }

  getReleaseReadiness(domain?: ClockchainDomain) {
    let summary: ReturnType<typeof validatorModule.runValidation>;
    try {
      summary = validatorModule.runValidation(this.ntxRootDir);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Clockchain validation failed";
      return {
        coverageByDomain: {} as Record<string, { coverageRatio: number }>,
        errors: [message],
        criticalFailures: [`clockchain artifacts unavailable at ${this.ntxRootDir}`],
        latestEvidenceRecorded: null,
      };
    }
    const coverage = domain ? { [domain]: summary.coverageByDomain[domain] } : summary.coverageByDomain;
    return {
      coverageByDomain: coverage,
      errors: domain ? summary.errors.filter((entry) => entry.includes(` ${domain}`) || entry.includes(`-${domain}-`)) : summary.errors,
      criticalFailures: summary.criticalFailures,
      latestEvidenceRecorded: summary.latestEvidenceRecorded,
    };
  }

  private loadGraph() {
    const files = validatorModule.listNtxFiles(this.ntxRootDir);
    return validatorModule.parseGraph(files);
  }

  private loadNotes(): ZettelkastenNote[] {
    if (!fs.existsSync(this.notesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.notesDir)
      .filter((entry) => entry.toLowerCase().endsWith(".md"))
      .map((entry) => {
        const content = fs.readFileSync(path.join(this.notesDir, entry), "utf8");
        const meta = parseFrontmatter(content);
        return {
          id: String(meta.id ?? entry.replace(/\.md$/i, "")),
          domain: String(meta.domain ?? ""),
          kind: String(meta.kind ?? ""),
          layer: String(meta.layer ?? ""),
          ntRefs: Array.isArray(meta.nt_refs) ? meta.nt_refs : [],
          artifactRefs: Array.isArray(meta.artifact_refs) ? meta.artifact_refs : [],
          testRefs: Array.isArray(meta.test_refs) ? meta.test_refs : [],
          metricRefs: Array.isArray(meta.metric_refs) ? meta.metric_refs : [],
          evidenceRefs: Array.isArray(meta.evidence_refs) ? meta.evidence_refs : [],
          conflicts: Array.isArray(meta.conflicts) ? meta.conflicts : [],
        };
      })
      .filter((note) => note.domain);
  }
}
