#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_NTX_DIR = path.join(process.cwd(), "docs", "clockchain", "ntx");
const REQUIRED_TRACE_STAGES = ["Req", "Design", "Code", "Test", "Telemetry"];
const CRITICAL_NODE_KINDS = new Set(["REQ", "CTR", "DEC", "CMP", "ART", "TST", "MET", "EVD"]);

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function listNtxFiles(rootDir) {
  const out = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listNtxFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".ntx")) {
      out.push(fullPath);
    }
  }
  return out.sort();
}

function extractDomainFromNodeId(id) {
  const match = id.match(/^(?:REQ|DEC|CTR|CMP|TST|MET|EVD|RSK|POL|TASK)-([A-Z0-9]+)-\d+$/);
  return match ? match[1] : null;
}

function extractDomainFromTraceId(id) {
  const match = id.match(/^([A-Z0-9]+)-\d+$/);
  return match ? match[1] : null;
}

function parseTraceLine(line, file, lineNumber) {
  const match = line.match(/^TR#([A-Z0-9-]+)\s*:=\s*(.+)$/);
  if (!match) {
    return null;
  }

  const traceId = match[1];
  const body = match[2];
  const refs = {};
  const stageRegex = /([A-Za-z]+)\{([^}]*)\}/g;
  let stageMatch;
  while ((stageMatch = stageRegex.exec(body)) !== null) {
    if (stageMatch[1] === "cov") {
      continue;
    }
    refs[stageMatch[1]] = stageMatch[2]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const coverageMatch = body.match(/\/cov\{([^}]*)\}/);
  return {
    id: traceId,
    domain: extractDomainFromTraceId(traceId),
    refs,
    coverage: coverageMatch ? coverageMatch[1] : "",
    file,
    line: lineNumber,
  };
}

function parseGraph(files) {
  const nodes = new Map();
  const edges = [];
  const traces = [];
  const errors = [];
  const warnings = [];
  const edgeIds = new Set();
  const traceIds = new Set();

  const nodeRegex = /^NT:N#([A-Z0-9-]+)\s+\[([A-Z]+)\]/;
  const edgeRegex = /^NT:S#([A-Z0-9-]+)\s+\(([A-Z0-9-]+)\s+-([A-Z]+)\[w=([0-9.]+)\]->\s+([A-Z0-9-]+)\)/;

  let currentNodeId = null;

  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const rawLine = lines[index];
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const nodeMatch = line.match(nodeRegex);
      if (nodeMatch) {
        const id = nodeMatch[1];
        const kind = nodeMatch[2];
        if (nodes.has(id)) {
          errors.push(`Duplicate node ${id} at ${file}:${index + 1}`);
        }
        nodes.set(id, {
          id,
          kind,
          domain: extractDomainFromNodeId(id),
          file,
          line: index + 1,
          zref: null,
        });
        currentNodeId = id;
        continue;
      }

      if (currentNodeId && line.includes("meta{")) {
        const zrefMatch = line.match(/zref:([A-Z0-9-]+)/);
        if (zrefMatch) {
          const node = nodes.get(currentNodeId);
          node.zref = zrefMatch[1];
        }
      }

      const edgeMatch = line.match(edgeRegex);
      if (edgeMatch) {
        const edgeId = edgeMatch[1];
        if (edgeIds.has(edgeId)) {
          errors.push(`Duplicate edge ${edgeId} at ${file}:${index + 1}`);
        }
        edgeIds.add(edgeId);
        edges.push({
          id: edgeId,
          from: edgeMatch[2],
          type: edgeMatch[3],
          weight: Number(edgeMatch[4]),
          to: edgeMatch[5],
          file,
          line: index + 1,
        });
        currentNodeId = null;
        continue;
      }

      const trace = parseTraceLine(line, file, index + 1);
      if (trace) {
        if (traceIds.has(trace.id)) {
          errors.push(`Duplicate trace ${trace.id} at ${file}:${index + 1}`);
        }
        traceIds.add(trace.id);
        traces.push(trace);
        currentNodeId = null;
        continue;
      }

      if (line.startsWith("NT:")) {
        currentNodeId = null;
      }
    }
  }

  if (nodes.size < 30) {
    warnings.push("Node count is below 30; expected baseline is 30-60 nodes.");
  }

  return { nodes, edges, traces, errors, warnings };
}

function validateEdgeTargets(nodes, edges) {
  const errors = [];
  for (const edge of edges) {
    if (!nodes.has(edge.from)) {
      errors.push(`Edge source ${edge.from} not found (${edge.file}:${edge.line})`);
    }
    if (!nodes.has(edge.to)) {
      errors.push(`Edge target ${edge.to} not found (${edge.file}:${edge.line})`);
    }
  }
  return errors;
}

function validateTraceRefs(nodes, traces) {
  const errors = [];

  for (const trace of traces) {
    for (const stage of REQUIRED_TRACE_STAGES) {
      const refs = trace.refs[stage] || [];
      if (refs.length === 0) {
        errors.push(`Trace ${trace.id} missing ${stage} stage (${trace.file}:${trace.line})`);
      }
    }

    const testRefs = trace.refs.Test || [];
    if (!testRefs.some((id) => nodes.get(id)?.kind === "TST")) {
      errors.push(`Trace ${trace.id} is missing TST refs in Test stage (${trace.file}:${trace.line})`);
    }

    const telemetryRefs = trace.refs.Telemetry || [];
    if (!telemetryRefs.some((id) => nodes.get(id)?.kind === "MET")) {
      errors.push(`Trace ${trace.id} is missing MET refs in Telemetry stage (${trace.file}:${trace.line})`);
    }
    if (!telemetryRefs.some((id) => nodes.get(id)?.kind === "EVD")) {
      errors.push(`Trace ${trace.id} is missing EVD refs in Telemetry stage (${trace.file}:${trace.line})`);
    }

    for (const refs of Object.values(trace.refs)) {
      for (const ref of refs) {
        if (!nodes.has(ref)) {
          errors.push(`Trace ${trace.id} references unknown node ${ref} (${trace.file}:${trace.line})`);
        }
      }
    }
  }

  return errors;
}

function buildTraceCoverage(nodes, edges) {
  const coverage = new Map();

  for (const [id, node] of nodes.entries()) {
    if (node.kind !== "REQ" && node.kind !== "CTR") {
      continue;
    }
    coverage.set(id, { hasTstTrace: false, hasMetTrace: false });
  }

  for (const edge of edges) {
    if (edge.type !== "TRACE") {
      continue;
    }

    const sourceCoverage = coverage.get(edge.from);
    const targetCoverage = coverage.get(edge.to);
    const sourceNode = nodes.get(edge.from);
    const targetNode = nodes.get(edge.to);

    if (sourceCoverage && targetNode?.kind === "TST") {
      sourceCoverage.hasTstTrace = true;
    }
    if (sourceCoverage && targetNode?.kind === "MET") {
      sourceCoverage.hasMetTrace = true;
    }
    if (targetCoverage && sourceNode?.kind === "TST") {
      targetCoverage.hasTstTrace = true;
    }
    if (targetCoverage && sourceNode?.kind === "MET") {
      targetCoverage.hasMetTrace = true;
    }
  }

  return coverage;
}

function validateNTR2(nodes, edges) {
  const errors = [];
  const coverage = buildTraceCoverage(nodes, edges);

  for (const [id, state] of coverage.entries()) {
    const missing = [];
    if (!state.hasTstTrace) missing.push("TST");
    if (!state.hasMetTrace) missing.push("MET");
    if (missing.length > 0) {
      errors.push(`NT-R2 failed for ${id}: missing TRACE link(s) to ${missing.join("+")}`);
    }
  }

  return errors;
}

function validateTraceDomains(nodes, traces) {
  const errors = [];
  const domainsWithCriticalNodes = new Set();
  const domainsWithTraces = new Set();

  for (const node of nodes.values()) {
    if ((node.kind === "REQ" || node.kind === "CTR") && node.domain) {
      domainsWithCriticalNodes.add(node.domain);
    }
  }

  for (const trace of traces) {
    if (trace.domain) {
      domainsWithTraces.add(trace.domain);
    }
  }

  for (const domain of [...domainsWithCriticalNodes].sort()) {
    if (!domainsWithTraces.has(domain)) {
      errors.push(`Missing TR# for domain ${domain}`);
    }
  }

  return errors;
}

function validateOpenConflicts(nodes, edges) {
  const criticalFailures = [];

  for (const edge of edges) {
    if (edge.type !== "CONFLICT") {
      continue;
    }

    const fromNode = nodes.get(edge.from);
    const toNode = nodes.get(edge.to);
    const fromCritical = fromNode && CRITICAL_NODE_KINDS.has(fromNode.kind);
    const toCritical = toNode && CRITICAL_NODE_KINDS.has(toNode.kind);
    if (fromCritical || toCritical) {
      criticalFailures.push(
        `Open CONFLICT on critical path: ${edge.from} -> ${edge.to} (${edge.file}:${edge.line})`
      );
    }
  }

  return criticalFailures;
}

function buildCoverageByDomain(nodes, edges, traces) {
  const coverage = {};
  const traceCoverage = buildTraceCoverage(nodes, edges);

  function ensureDomain(domain) {
    if (!domain) {
      return null;
    }
    if (!coverage[domain]) {
      coverage[domain] = {
        reqCount: 0,
        ctrCount: 0,
        traceCount: 0,
        reqCtrCovered: 0,
        reqCtrTotal: 0,
      };
    }
    return coverage[domain];
  }

  for (const [id, node] of nodes.entries()) {
    if (node.kind !== "REQ" && node.kind !== "CTR") {
      continue;
    }
    const bucket = ensureDomain(node.domain);
    if (!bucket) {
      continue;
    }

    bucket.reqCtrTotal += 1;
    if (node.kind === "REQ") bucket.reqCount += 1;
    if (node.kind === "CTR") bucket.ctrCount += 1;

    const state = traceCoverage.get(id);
    if (state?.hasTstTrace && state?.hasMetTrace) {
      bucket.reqCtrCovered += 1;
    }
  }

  for (const trace of traces) {
    const bucket = ensureDomain(trace.domain);
    if (bucket) {
      bucket.traceCount += 1;
    }
  }

  return Object.fromEntries(
    Object.entries(coverage)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([domain, bucket]) => [
        domain,
        {
          ...bucket,
          coverageRatio:
            bucket.reqCtrTotal === 0 ? 0 : Number((bucket.reqCtrCovered / bucket.reqCtrTotal).toFixed(2)),
        },
      ])
  );
}

function collectRuntimeEvidenceFiles() {
  const candidates = [];
  const directFiles = [
    path.join(process.cwd(), "narrative_ledger.jsonl"),
    path.join(process.cwd(), "narrative_memory", "narrative_ledger.jsonl"),
  ];
  for (const file of directFiles) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      candidates.push(file);
    }
  }

  const backendDir = path.join(process.cwd(), "backend", "database");
  if (fs.existsSync(backendDir) && fs.statSync(backendDir).isDirectory()) {
    for (const entry of fs.readdirSync(backendDir, { withFileTypes: true })) {
      const lowerName = entry.name.toLowerCase();
      if (entry.isFile() && lowerName.endsWith(".jsonl") && !lowerName.endsWith(".seed.jsonl")) {
        candidates.push(path.join(backendDir, entry.name));
      }
    }
  }

  return candidates;
}

function readLatestJsonlEntry(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  const raw = lines[lines.length - 1];
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function findLatestEvidenceRecorded() {
  const files = collectRuntimeEvidenceFiles();
  let latest = null;

  for (const file of files) {
    const stats = fs.statSync(file);
    const entry = readLatestJsonlEntry(file);
    if (entry === null) {
      continue;
    }
    const candidate = {
      file: path.relative(process.cwd(), file),
      modifiedAt: stats.mtime.toISOString(),
      entry,
    };
    if (!latest || stats.mtimeMs > latest.modifiedAtMs) {
      latest = { ...candidate, modifiedAtMs: stats.mtimeMs };
    }
  }

  if (!latest) {
    return null;
  }

  const { modifiedAtMs, ...rest } = latest;
  return rest;
}

function buildHumanSummary(summary) {
  const lines = [
    "# Clockchain Traceability Summary",
    "",
    `- Root: \`${summary.rootDir}\``,
    `- Files: ${summary.files}`,
    `- Nodes: ${summary.nodes}`,
    `- Edges: ${summary.edges}`,
    `- Traces: ${summary.traceCount}`,
    "",
    "## Coverage by Domain",
    "",
    "| Domain | REQ | CTR | TR | Covered | Total | Ratio |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const [domain, bucket] of Object.entries(summary.coverageByDomain)) {
    lines.push(
      `| ${domain} | ${bucket.reqCount} | ${bucket.ctrCount} | ${bucket.traceCount} | ${bucket.reqCtrCovered} | ${bucket.reqCtrTotal} | ${bucket.coverageRatio} |`
    );
  }

  lines.push("", "## Validation");
  lines.push(`- Errors: ${summary.errors.length}`);
  lines.push(`- Warnings: ${summary.warnings.length}`);
  lines.push(`- Critical failures: ${summary.criticalFailures.length}`);

  if (summary.latestEvidenceRecorded) {
    lines.push("", "## Latest Evidence Recorded");
    lines.push(`- File: \`${summary.latestEvidenceRecorded.file}\``);
    lines.push(`- Modified: ${summary.latestEvidenceRecorded.modifiedAt}`);
    lines.push("```json");
    lines.push(JSON.stringify(summary.latestEvidenceRecorded.entry, null, 2));
    lines.push("```");
  }

  if (summary.errors.length > 0) {
    lines.push("", "## Errors");
    for (const error of summary.errors) {
      lines.push(`- ${error}`);
    }
  }

  if (summary.criticalFailures.length > 0) {
    lines.push("", "## Critical Failures");
    for (const failure of summary.criticalFailures) {
      lines.push(`- ${failure}`);
    }
  }

  if (summary.warnings.length > 0) {
    lines.push("", "## Warnings");
    for (const warning of summary.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function runValidation(rootDir = DEFAULT_NTX_DIR) {
  if (!fs.existsSync(rootDir)) {
    throw new Error(`NTX directory not found: ${rootDir}`);
  }

  const ntxFiles = listNtxFiles(rootDir);
  if (ntxFiles.length === 0) {
    throw new Error(`No .ntx files found in ${rootDir}`);
  }

  const graph = parseGraph(ntxFiles);
  const errors = [
    ...graph.errors,
    ...validateEdgeTargets(graph.nodes, graph.edges),
    ...validateTraceRefs(graph.nodes, graph.traces),
    ...validateNTR2(graph.nodes, graph.edges),
    ...validateTraceDomains(graph.nodes, graph.traces),
  ];
  const criticalFailures = validateOpenConflicts(graph.nodes, graph.edges);

  const summary = {
    rootDir,
    files: ntxFiles.length,
    nodes: graph.nodes.size,
    edges: graph.edges.length,
    traceCount: graph.traces.length,
    coverageByDomain: buildCoverageByDomain(graph.nodes, graph.edges, graph.traces),
    errors,
    warnings: graph.warnings,
    criticalFailures,
    latestEvidenceRecorded: findLatestEvidenceRecorded(),
  };
  summary.markdown = buildHumanSummary(summary);
  return summary;
}

function parseArgs(argv) {
  const args = { root: DEFAULT_NTX_DIR, jsonOut: null, mdOut: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--json-out") {
      args.jsonOut = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--md-out") {
      args.mdOut = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
    }
  }
  return args;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const summary = runValidation(args.root);

    if (args.jsonOut) {
      ensureParentDir(args.jsonOut);
      fs.writeFileSync(args.jsonOut, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    }
    if (args.mdOut) {
      ensureParentDir(args.mdOut);
      fs.writeFileSync(args.mdOut, summary.markdown, "utf8");
    }

    if (args.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      process.stdout.write(summary.markdown);
    }

    if (summary.errors.length > 0 || summary.criticalFailures.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildHumanSummary,
  listNtxFiles,
  parseGraph,
  parseTraceLine,
  runValidation,
};
