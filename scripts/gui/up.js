#!/usr/bin/env node
"use strict";

const { spawn } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function spawnTask(args) {
  return spawn(npmCommand, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
  });
}

const children = [spawnTask(["run", "api:identity"]), spawnTask(["run", "gui:dev"])];

function shutdown(code) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
  setTimeout(() => process.exit(code), 150);
}

for (const child of children) {
  child.on("exit", (code) => {
    shutdown(code || 0);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
