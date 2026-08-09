// ─── Time Travel — Snapshots de código con contexto ────────────────────
// BELL 13450.50 | Pentetraktys 4D
// Captura snapshots antes/después de ediciones con razón y diff.

import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";

const SNAPSHOTS_DIR = path.resolve(process.cwd(), "docs/snapshots");

async function ensureDir(): Promise<void> {
  try { await fs.mkdir(SNAPSHOTS_DIR, { recursive: true }); } catch { /* ok */ }
}

function snapshotPath(filePath: string, timestamp: string): string {
  const safe = filePath.replace(/[/\\]/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "-");
  return path.join(SNAPSHOTS_DIR, `${timestamp}_${safe}.snap`);
}

async function shell(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { cwd, shell: "bash", timeout: 15000, windowsHide: true }, (_, stdout) => {
      resolve((stdout || "").trim());
    });
  });
}

export async function timeTravel(
  op: "capture" | "query" | "diff" | "list",
  filePath?: string,
  reason?: string,
  date1?: string,
  date2?: string
): Promise<string> {
  await ensureDir();

  switch (op) {
    case "capture": {
      if (!filePath) return "❌ time_travel capture requiere 'filePath'";
      const fullPath = path.resolve(process.cwd(), filePath);
      if (!(await fileExists(fullPath))) return `❌ Archivo no encontrado: ${filePath}`;

      const now = new Date().toISOString().replace(/[:.]/g, "-");
      const content = await fs.readFile(fullPath, "utf-8");

      // Obtener diff con git
      const diff = await shell(`git diff -- "${filePath}"`, process.cwd());

      const snapData = [
        `# Snapshot: ${filePath}`,
        `Date: ${now}`,
        `Reason: ${reason || "(sin razón registrada)"}`,
        ``,
        `## Diff`,
        "```diff",
        diff || "(sin cambios detectados)",
        "```",
        ``,
        `## Content (${content.split("\n").length} líneas)`,
        "```",
        content.slice(0, 10000),
        content.length > 10000 ? "\n... (truncado)" : "",
        "```",
      ].join("\n");

      const sp = snapshotPath(filePath, now);
      await fs.writeFile(sp, snapData, "utf-8");
      return `📸 Snapshot capturado: ${filePath} (${content.split("\n").length} líneas, diff: ${diff.length} chars) → ${path.basename(sp)}`;
    }
    case "query": {
      if (!filePath) return "❌ time_travel query requiere 'filePath'";
      try {
        const files = await fs.readdir(SNAPSHOTS_DIR);
        const matches = files
          .filter((f) => f.includes(filePath.replace(/[/\\]/g, "_")) && f.endsWith(".snap"))
          .sort()
          .reverse()
          .slice(0, 10);

        if (matches.length === 0) return `📸 Sin snapshots para: ${filePath}`;
        return `📸 ${matches.length} snapshots de ${filePath}:\n${matches.map((m) => `  ${m}`).join("\n")}`;
      } catch {
        return "📸 Sin snapshots registrados.";
      }
    }
    case "diff": {
      if (!filePath) return "❌ time_travel diff requiere 'filePath'";
      try {
        const files = await fs.readdir(SNAPSHOTS_DIR);
        const matches = files
          .filter((f) => f.includes(filePath.replace(/[/\\]/g, "_")) && f.endsWith(".snap"))
          .sort()
          .reverse();

        if (matches.length < 2) return "📸 Se necesitan al menos 2 snapshots para comparar.";

        const latest = matches[0];
        const previous = matches[1];

        const latestContent = await fs.readFile(path.join(SNAPSHOTS_DIR, latest), "utf-8");
        const prevContent = await fs.readFile(path.join(SNAPSHOTS_DIR, previous), "utf-8");

        return `📸 Comparación: ${previous} → ${latest}\n\n--- ${previous}\n${prevContent.slice(0, 2000)}\n\n--- ${latest}\n${latestContent.slice(0, 2000)}`;
      } catch {
        return "📸 Sin snapshots para comparar.";
      }
    }
    case "list": {
      try {
        const files = await fs.readdir(SNAPSHOTS_DIR);
        const snaps = files.filter((f) => f.endsWith(".snap")).sort().reverse();
        if (snaps.length === 0) return "📸 Sin snapshots.";
        return `📸 ${snaps.length} snapshots:\n${snaps.slice(0, 20).map((s) => `  ${s}`).join("\n")}`;
      } catch {
        return "📸 Sin snapshots.";
      }
    }
    default:
      return `❌ Operación desconocida: "${op}". Usa: capture, query, diff, list.`;
  }
}

async function fileExists(fp: string): Promise<boolean> {
  try { await fs.access(fp); return true; } catch { return false; }
}
