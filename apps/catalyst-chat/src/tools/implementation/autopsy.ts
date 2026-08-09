// ─── Error Autopsy — Diagnóstico de causa raíz ────────────────────────
// BELL 13450.50 | Pentetraktys 4D
// Correlaciona errores con cambios recientes para encontrar la causa raíz.

import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";

export interface AutopsyHypothesis {
  file: string;
  reason: string;
  probability: number; // 0-1
  isRootCauseLikely: boolean;
}

export interface AutopsyResult {
  error: string;
  hypotheses: AutopsyHypothesis[];
  rootCauseLikely: string | null;
  recommendedFix: string;
}

async function shell(cmd: string, cwd: string, timeout = 15000): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { cwd, shell: "bash", timeout, maxBuffer: 500000, windowsHide: true }, (_, stdout) => {
      resolve((stdout || "").trim());
    });
  });
}

export async function performAutopsy(errorMessage: string, cwd: string): Promise<AutopsyResult> {
  const hypotheses: AutopsyHypothesis[] = [];

  // 1. Extraer archivos del stack trace
  const filePattern = /(?:at |in |file )([^\s:]*\.(?:ts|tsx|js|py|sol))(?::\d+)?/gi;
  const mentionedFiles = new Set<string>();
  let match;
  while ((match = filePattern.exec(errorMessage)) !== null) {
    mentionedFiles.add(match[1]);
  }

  // 2. Buscar cambios recientes en esos archivos (git diff reciente)
  const recentChanges = await shell(
    `git diff --name-only HEAD~5 2>/dev/null | head -20`,
    cwd
  );
  const changedFiles = recentChanges.split("\n").filter(Boolean);

  // 3. Correlacionar: si un archivo del error fue cambiado recientemente, alta probabilidad
  for (const file of mentionedFiles) {
    const wasChanged = changedFiles.some((cf) => cf.includes(file) || file.includes(cf));
    hypotheses.push({
      file,
      reason: wasChanged
        ? `"${file}" fue modificado recientemente — probable causa del error`
        : `"${file}" aparece en el stack trace pero no fue modificado recientemente — posible efecto secundario`,
      probability: wasChanged ? 0.85 : 0.4,
      isRootCauseLikely: wasChanged,
    });
  }

  // 4. Si no hay archivos en el stack, buscar en cambios recientes
  if (hypotheses.length === 0 && changedFiles.length > 0) {
    for (const cf of changedFiles.slice(0, 5)) {
      hypotheses.push({
        file: cf,
        reason: `Archivo modificado recientemente — podría estar relacionado con el error`,
        probability: 0.3,
        isRootCauseLikely: false,
      });
    }
  }

  // 5. Buscar snapshots (time_travel) que contengan el archivo del error
  let snapshotContext = "";
  try {
    const snapDir = path.join(cwd, "docs/snapshots");
    const snaps = await fs.readdir(snapDir);
    const relevantSnaps = snaps
      .filter((s) => {
        for (const f of mentionedFiles) {
          if (s.includes(f.replace(/[/\\]/g, "_"))) return true;
        }
        return false;
      })
      .slice(0, 3);

    if (relevantSnaps.length > 0) {
      snapshotContext = `\n📸 ${relevantSnaps.length} snapshots relevantes encontrados: ${relevantSnaps.join(", ")}`;
    }
  } catch { /* no snapshots dir */ }

  // 6. Root cause y fix
  const likelyHypotheses = hypotheses.filter((h) => h.isRootCauseLikely);
  const rootCauseLikely = likelyHypotheses.length > 0
    ? `${likelyHypotheses[0].file} — ${likelyHypotheses[0].reason}`
    : null;

  const recommendedFix = rootCauseLikely
    ? `Revisar ${likelyHypotheses[0].file} y deshacer o corregir el cambio reciente. Luego ejecutar run_build para verificar.`
    : "No se pudo determinar la causa raíz automáticamente. Revisar los archivos en el stack trace manualmente.";

  return {
    error: errorMessage.slice(0, 500),
    hypotheses,
    rootCauseLikely,
    recommendedFix: recommendedFix + snapshotContext,
  };
}

export function formatAutopsy(a: AutopsyResult): string {
  let out = `≪ AUTOPSIA DE ERROR ≫\n\n`;
  out += `💥 Error: ${a.error.slice(0, 300)}...\n\n`;

  if (a.hypotheses.length > 0) {
    out += `🔍 HIPÓTESIS (ordenadas por probabilidad):\n\n`;
    a.hypotheses
      .sort((a, b) => b.probability - a.probability)
      .forEach((h, i) => {
        const bar = "█".repeat(Math.round(h.probability * 10));
        out += `${i + 1}. ${h.file} [${bar}] ${Math.round(h.probability * 100)}%\n`;
        out += `   ${h.reason}\n\n`;
      });
  } else {
    out += `🔍 No se pudieron generar hipótesis automáticas.\n\n`;
  }

  if (a.rootCauseLikely) {
    out += `🎯 CAUSA RAÍZ PROBABLE:\n   ${a.rootCauseLikely}\n\n`;
  }

  out += `🔧 FIX RECOMENDADO:\n   ${a.recommendedFix}\n`;
  out += `\n✅ ¿Aplicar fix sugerido?`;

  return out;
}
