#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const NTX_DIR = path.join(process.cwd(), "docs", "clockchain", "ntx");

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

function parseGraph(files) {
  const nodes = new Map();
  const edges = [];
  const errors = [];

  const nodeRegex = /^NT:N#([A-Z0-9-]+)\s+\[([A-Z]+)\]/;
  const edgeRegex = /^NT:S#[^\s]+\s+\(([A-Z0-9-]+)\s+-([A-Z]+)\[w=[0-9.]+\]->\s+([A-Z0-9-]+)\)/;

  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }

      const nodeMatch = line.match(nodeRegex);
      if (nodeMatch) {
        const id = nodeMatch[1];
        const kind = nodeMatch[2];
        if (nodes.has(id)) {
          errors.push(`Duplicate node ${id} at ${file}:${i + 1}`);
        }
        nodes.set(id, { kind, file, line: i + 1 });
        continue;
      }

      const edgeMatch = line.match(edgeRegex);
      if (edgeMatch) {
        edges.push({
          from: edgeMatch[1],
          type: edgeMatch[2],
          to: edgeMatch[3],
          file,
          line: i + 1,
        });
      }
    }
  }

  return { nodes, edges, errors };
}

function validateNTR2(nodes, edges) {
  const errors = [];

  for (const edge of edges) {
    if (!nodes.has(edge.from)) {
      errors.push(`Edge source ${edge.from} not found (${edge.file}:${edge.line})`);
    }
    if (!nodes.has(edge.to)) {
      errors.push(`Edge target ${edge.to} not found (${edge.file}:${edge.line})`);
    }
  }

  const reqAndCtrIds = [];
  for (const [id, node] of nodes.entries()) {
    if (node.kind === "REQ" || node.kind === "CTR") {
      reqAndCtrIds.push(id);
    }
  }

  for (const id of reqAndCtrIds) {
    let hasTstTrace = false;
    let hasMetTrace = false;

    for (const edge of edges) {
      if (edge.type !== "TRACE") {
        continue;
      }

      if (edge.from !== id && edge.to !== id) {
        continue;
      }

      const peerId = edge.from === id ? edge.to : edge.from;
      const peer = nodes.get(peerId);
      if (!peer) {
        continue;
      }

      if (peer.kind === "TST") {
        hasTstTrace = true;
      }
      if (peer.kind === "MET") {
        hasMetTrace = true;
      }
    }

    if (!hasTstTrace || !hasMetTrace) {
      const missing = [];
      if (!hasTstTrace) missing.push("TST");
      if (!hasMetTrace) missing.push("MET");
      errors.push(`NT-R2 failed for ${id}: missing TRACE link(s) to ${missing.join("+")}`);
    }
  }

  return errors;
}

function main() {
  if (!fs.existsSync(NTX_DIR)) {
    console.error(`NTX directory not found: ${NTX_DIR}`);
    process.exit(1);
  }

  const ntxFiles = listNtxFiles(NTX_DIR);
  if (ntxFiles.length === 0) {
    console.error(`No .ntx files found in ${NTX_DIR}`);
    process.exit(1);
  }

  const { nodes, edges, errors: parseErrors } = parseGraph(ntxFiles);
  const validationErrors = validateNTR2(nodes, edges);
  const allErrors = [...parseErrors, ...validationErrors];

  console.log("NTX validation summary");
  console.log(`- files: ${ntxFiles.length}`);
  console.log(`- nodes: ${nodes.size}`);
  console.log(`- edges: ${edges.length}`);

  if (nodes.size < 30) {
    console.warn("Warning: node count is below 30; expected baseline is 30-60 nodes.");
  }

  if (allErrors.length > 0) {
    console.error("\nValidation errors:");
    for (const err of allErrors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }

  console.log("NT-R2 validation passed.");
}

main();
