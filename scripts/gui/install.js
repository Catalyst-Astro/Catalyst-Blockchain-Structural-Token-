#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(npmCommand, ["ci", "--prefer-offline", "--no-audit", "--fund=false"], repoRoot);
run(npmCommand, ["--prefix", "apps/catalyst-gui", "ci", "--prefer-offline", "--no-audit", "--fund=false"], repoRoot);
