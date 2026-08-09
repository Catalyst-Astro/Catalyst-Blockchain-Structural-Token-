// ─── Memory Thread — ADRs con trazabilidad causal ─────────────────────
// BELL 13450.50 | Pentetraktys 4D
// Registra decisiones arquitectónicas como archivos markdown en docs/threads/

import * as fs from "fs/promises";
import * as path from "path";

const THREADS_DIR = path.resolve(process.cwd(), "docs/threads");

async function ensureDir(): Promise<void> {
  try { await fs.mkdir(THREADS_DIR, { recursive: true }); } catch { /* ok */ }
}

function threadPath(object: string): string {
  const safe = object.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").toLowerCase();
  return path.join(THREADS_DIR, `${safe}.md`);
}

async function getAllThreads(): Promise<string[]> {
  try {
    const files = await fs.readdir(THREADS_DIR);
    return files.filter((f) => f.endsWith(".md")).map((f) => f.replace(".md", ""));
  } catch {
    return [];
  }
}

export async function performMemoryThread(
  op: "record" | "get" | "contradictions" | "list",
  object?: string,
  reason?: string,
  parentId?: string
): Promise<string> {
  await ensureDir();

  switch (op) {
    case "record": {
      if (!object || !reason) return "❌ memory_thread record requiere 'object' y 'reason'";
      const fp = threadPath(object);
      const now = new Date().toISOString();
      const existed = await fileExists(fp);
      const entry = existed
        ? `\n---\n## ${now}\n**Decisión:** ${reason}\n${parentId ? `**Parent:** [[${parentId}]]\n` : ""}`
        : `# ADR: ${object}\n\n## ${now}\n**Decisión:** ${reason}\n${parentId ? `**Parent:** [[${parentId}]]\n` : ""}\n`;
      await fs.appendFile(fp, entry, "utf-8");
      return existed
        ? `✅ ADR actualizado: [[${object}]] — ${reason.slice(0, 100)}`
        : `✅ ADR creado: [[${object}]] — ${reason.slice(0, 100)}`;
    }
    case "get": {
      if (!object) return "❌ memory_thread get requiere 'object'";
      const fp = threadPath(object);
      if (!(await fileExists(fp))) return `‡ ADR [[${object}]] no existe. Crea uno con memory_thread record.`;
      const content = await fs.readFile(fp, "utf-8");
      return `📜 ADR: [[${object}]]\n\n${content.slice(0, 4000)}`;
    }
    case "contradictions": {
      const all = await getAllThreads();
      if (all.length < 2) return "✅ No hay suficientes ADRs para detectar contradicciones (mínimo 2).";
      // Búsqueda simple: palabras clave opuestas
      const opposites = [
        ["JWT", "session"], ["SQL", "NoSQL"], ["REST", "GraphQL"],
        ["monolith", "microservice"], ["sync", "async"],
      ];
      const findings: string[] = [];
      for (const [a, b] of opposites) {
        for (const t of all) {
          const fp = threadPath(t);
          const content = await fs.readFile(fp, "utf-8");
          if (content.includes(a) && content.includes(b)) {
            findings.push(`⚠️ [[${t}]] menciona "${a}" y "${b}" — posible contradicción`);
          }
        }
      }
      if (findings.length === 0) return "✅ No se detectaron contradicciones en los ADRs.";
      return `Δ CONTRADICCIONES DETECTADAS:\n${findings.join("\n")}`;
    }
    case "list": {
      const all = await getAllThreads();
      if (all.length === 0) return "📜 Sin ADRs registrados. Crea uno con memory_thread record.";
      return `📜 ${all.length} ADRs:\n${all.map((t) => `  [[${t}]]`).join("\n")}`;
    }
    default:
      return `❌ Operación desconocida: "${op}"`;
  }
}

async function fileExists(fp: string): Promise<boolean> {
  try { await fs.access(fp); return true; } catch { return false; }
}
