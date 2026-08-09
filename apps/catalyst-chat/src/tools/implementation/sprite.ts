// ─── Invoke Sprite — Memoria del monorepo ─────────────────────────────
// BELL 13450.50 | Pentetraktys 4D
// Busca soluciones previas en código, git log y ZK de todo el monorepo.

import { exec } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";

export interface SpriteHit {
  source: "code" | "git" | "zk";
  filePath?: string;
  snippet?: string;
  gitCommit?: string;
  gitDate?: string;
  zkNoteId?: string;
  context: string;
}

async function shell(cmd: string, cwd: string, timeout = 15000): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { cwd, shell: "bash", timeout, maxBuffer: 500000, windowsHide: true }, (_, stdout) => {
      resolve((stdout || "").trim());
    });
  });
}

export async function findSimilarSolutions(keywords: string[], cwd: string): Promise<SpriteHit[]> {
  const hits: SpriteHit[] = [];
  const monorepoRoot = cwd; // Asume que cwd es la raíz del monorepo

  for (const kw of keywords.slice(0, 5)) {
    // 1. Buscar en código
    try {
      const grepResult = await shell(
        `grep -rn --include="*.ts" --include="*.tsx" --include="*.py" --include="*.sol" --include="*.js" "${kw}" . 2>/dev/null | head -10`,
        monorepoRoot,
        15000
      );
      if (grepResult) {
        for (const line of grepResult.split("\n").slice(0, 5)) {
          const [filePath, ...rest] = line.split(":");
          if (filePath && !filePath.includes("node_modules") && !filePath.includes(".next")) {
            hits.push({
              source: "code",
              filePath,
              snippet: rest.join(":").trim().slice(0, 200),
              context: `Coincidencia de "${kw}" en el código`,
            });
          }
        }
      }
    } catch { /* grep might fail */ }

    // 2. Buscar en git log
    try {
      const gitResult = await shell(
        `git log --oneline --all --grep="${kw}" -10 2>/dev/null`,
        monorepoRoot,
        15000
      );
      if (gitResult) {
        for (const line of gitResult.split("\n").slice(0, 5)) {
          const parts = line.split(" ", 2);
          hits.push({
            source: "git",
            gitCommit: parts[0] || "",
            gitDate: "",
            context: parts[1]?.slice(0, 200) || line.slice(0, 200),
          });
        }
      }
    } catch { /* git might fail */ }

    // 3. Buscar en ZK notes
    try {
      const zkDir = path.join(monorepoRoot, "docs/zettelkasten");
      const files = await fs.readdir(zkDir);
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const content = await fs.readFile(path.join(zkDir, f), "utf-8");
        if (content.toLowerCase().includes(kw.toLowerCase())) {
          hits.push({
            source: "zk",
            zkNoteId: f.replace(".md", ""),
            snippet: content.slice(0, 200),
            context: `Nota ZK que contiene "${kw}"`,
          });
        }
      }
    } catch { /* ZK dir might not exist */ }
  }

  // Deducir duplicados
  const seen = new Set<string>();
  return hits.filter((h) => {
    const key = `${h.source}:${h.filePath || h.gitCommit || h.zkNoteId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}

export function formatSprites(hits: SpriteHit[], keywords: string[]): string {
  if (hits.length === 0) {
    return `≪ INVOCACIÓN DE ESPÍRITUS ≫\n\n🔮 No encontré soluciones previas para: ${keywords.join(", ")}. Seré el primero en resolver esto.`;
  }

  let out = `≪ INVOCACIÓN DE ESPÍRITUS ≫\n\n`;
  out += `🔮 ${hits.length} soluciones previas encontradas:\n\n`;

  const bySource = { code: [] as SpriteHit[], git: [] as SpriteHit[], zk: [] as SpriteHit[] };
  for (const h of hits) bySource[h.source].push(h);

  if (bySource.code.length > 0) {
    out += `📄 CÓDIGO (${bySource.code.length}):\n`;
    for (const h of bySource.code) {
      out += `   [code] ${h.filePath}: ${h.snippet?.slice(0, 100) || ""}\n`;
    }
    out += `\n`;
  }

  if (bySource.git.length > 0) {
    out += `📋 GIT LOG (${bySource.git.length}):\n`;
    for (const h of bySource.git) {
      out += `   [git] ${h.gitCommit} ${h.context?.slice(0, 120) || ""}\n`;
    }
    out += `\n`;
  }

  if (bySource.zk.length > 0) {
    out += `‡ ZETTELKASTEN (${bySource.zk.length}):\n`;
    for (const h of bySource.zk) {
      out += `   [zk] [[${h.zkNoteId}]]: ${h.snippet?.slice(0, 120) || ""}\n`;
    }
    out += `\n`;
  }

  out += `💡 Usa estos hallazgos para no reinventar la rueda.`;
  return out;
}
