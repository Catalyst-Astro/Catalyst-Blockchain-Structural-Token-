#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const repoRoot = path.resolve(__dirname, "..", "..");
for (const envPath of [path.join(repoRoot, ".env"), path.join(repoRoot, "apps", "catalyst-gui", ".env")]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const requiredBridgeMethods = [
  "refresh",
  "sepoliaStatus",
  "operationsList",
  "operationsCreate",
  "notificationsGet",
  "notificationsUpdate",
  "aiCasesList",
  "aiCaseCreate",
  "aiCasePlan",
  "aiCaseApprove",
  "aiCaseExecute",
  "aiCaseReport",
  "aiReleaseReadiness",
  "uiCasesList",
  "uiCaseCreate",
  "uiCasePlan",
  "uiCaseReport",
];

function checkFile(filePath) {
  return fs.existsSync(path.join(repoRoot, filePath));
}

async function main() {
  const port = String(process.env.PORT || "4000");
  const baseUrl = process.env.CATALYST_API_URL || `http://127.0.0.1:${port}`;
  const preloadPath = path.join(repoRoot, "apps", "catalyst-gui", "electron", "preload.ts");
  const typePath = path.join(repoRoot, "apps", "catalyst-gui", "src", "types", "electron.d.ts");
  const preload = fs.readFileSync(preloadPath, "utf8");
  const typeDecl = fs.readFileSync(typePath, "utf8");
  const missingBridgeMethods = requiredBridgeMethods.filter(
    (entry) => !preload.includes(`${entry}:`) || !typeDecl.includes(entry)
  );

  const checks = [
    { label: "root package.json", ok: checkFile("package.json") },
    { label: "gui package.json", ok: checkFile(path.join("apps", "catalyst-gui", "package.json")) },
    { label: "backend entrypoint", ok: checkFile(path.join("backend", "api", "server.ts")) },
    { label: "electron preload", ok: checkFile(path.join("apps", "catalyst-gui", "electron", "preload.ts")) },
    { label: "bridge contract", ok: missingBridgeMethods.length === 0, detail: missingBridgeMethods.join(", ") },
    { label: "resolved backend url", ok: Boolean(baseUrl), detail: baseUrl },
  ];

  let backendReachable = false;
  let backendMessage = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${baseUrl}/ai/release/readiness`, { signal: controller.signal });
    clearTimeout(timeout);
    backendReachable = response.ok;
    backendMessage = response.ok ? `${baseUrl}/ai/release/readiness` : `HTTP ${response.status}`;
  } catch (error) {
    backendMessage = error instanceof Error ? error.message : "Unknown connectivity error";
  }

  checks.push({ label: "backend reachability", ok: backendReachable, detail: backendMessage });

  for (const check of checks) {
    const prefix = check.ok ? "[ok]" : "[fail]";
    const suffix = check.detail ? ` -> ${check.detail}` : "";
    console.log(`${prefix} ${check.label}${suffix}`);
  }

  if (checks.some((entry) => !entry.ok)) {
    process.exit(1);
  }

  console.log(`GUI doctor passed for port ${port}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
