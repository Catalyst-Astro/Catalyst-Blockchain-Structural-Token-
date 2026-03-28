#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return "";
  }
}

function isMergedIntoMain(refName) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", refName, "origin/main"], {
      cwd: process.cwd(),
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function revCount(range) {
  const value = tryGit(["rev-list", "--count", range]);
  return value ? Number(value) : 0;
}

function latestUniqueCommit(refName) {
  return tryGit(["log", "--oneline", "-1", `origin/main..${refName}`]);
}

function remoteRefs() {
  const raw = git([
    "for-each-ref",
    "--format=%(refname:short)|%(objectname:short)|%(committerdate:short)|%(subject)",
    "refs/remotes/origin",
  ]);

  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [name, sha, date, subject] = line.split("|");
      return { name, sha, date, subject };
    })
    .filter((ref) => ref.name !== "origin/main" && ref.name !== "origin/HEAD");
}

function classify(ref) {
  const merged = isMergedIntoMain(ref.name);
  const ahead = revCount(`origin/main..${ref.name}`);
  const behind = revCount(`${ref.name}..origin/main`);
  const unique = latestUniqueCommit(ref.name);
  const action = merged ? "borrar remota" : ahead > 0 ? "mantener y revisar" : "archivar";

  return {
    ...ref,
    merged,
    ahead,
    behind,
    unique,
    action,
    branch: ref.name.replace(/^origin\//, ""),
  };
}

function renderTable(rows) {
  const lines = [
    "| Rama | SHA | Fecha | Ahead | Behind | Accion | Ultimo commit unico |",
    "| --- | --- | --- | ---: | ---: | --- | --- |",
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.name} | ${row.sha} | ${row.date} | ${row.ahead} | ${row.behind} | ${row.action} | ${row.unique || row.subject} |`
    );
  }

  return lines.join("\n");
}

function buildReport() {
  const rows = remoteRefs().map(classify).sort((left, right) => left.name.localeCompare(right.name));
  const integrated = rows.filter((row) => row.merged);
  const divergent = rows.filter((row) => !row.merged);
  const deleteCommands = integrated.map((row) => `git push origin --delete ${row.branch}`);

  return [
    "# Remote Branch Audit",
    "",
    `Generated from \`origin/main\` at ${new Date().toISOString()}.`,
    "",
    "## Summary",
    "",
    `- Integrated into main: ${integrated.length}`,
    `- Divergent from main: ${divergent.length}`,
    `- Candidate delete commands prepared: ${deleteCommands.length}`,
    "",
    "## Integrated Branches",
    "",
    renderTable(integrated),
    "",
    "## Divergent Branches",
    "",
    renderTable(divergent),
    "",
    "## Prepared Delete Commands",
    "",
    "```bash",
    ...deleteCommands,
    "```",
    "",
    "## Review Commands",
    "",
    "```bash",
    "git log --graph --oneline --decorate origin/main...origin/<branch>",
    "git diff --stat origin/main...origin/<branch>",
    "git branch -r --merged origin/main",
    "git branch -r --no-merged origin/main",
    "```",
    "",
  ].join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const writeIndex = args.indexOf("--write");
  const report = buildReport();

  if (writeIndex >= 0) {
    const outputPath = args[writeIndex + 1];
    if (!outputPath) {
      throw new Error("Missing path after --write");
    }
    const target = path.resolve(process.cwd(), outputPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${report}\n`, "utf8");
    return;
  }

  process.stdout.write(`${report}\n`);
}

main();
