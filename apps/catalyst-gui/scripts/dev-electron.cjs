#!/usr/bin/env node
"use strict";

const { spawn, spawnSync } = require("child_process");
const path = require("path");
const waitOn = require("wait-on");

const appRoot = path.resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const electronBinary = require("electron");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.ELECTRON_START_URL = env.ELECTRON_START_URL || "http://localhost:5173";

function runBuild() {
  const result = spawnSync(npmCommand, ["run", "build:electron"], {
    cwd: appRoot,
    stdio: "inherit",
    shell: false,
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  runBuild();

  await waitOn({
    resources: ["http-get://localhost:5173"],
    timeout: 60_000,
    interval: 500,
    window: 1_000,
  });

  const child = spawn(electronBinary, ["."], {
    cwd: appRoot,
    stdio: "inherit",
    shell: false,
    env,
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    if (!child.killed) {
      child.kill(signal);
    }
  };

  child.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
