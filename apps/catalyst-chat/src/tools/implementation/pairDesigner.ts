// ─── Pair Designer — Detección de acoplamiento entre archivos ─────────
// BELL 13450.50 | Pentetraktys 4D
// Detecta imports/referencias cruzadas y sugiere orden de edición.

export interface CouplingPair {
  fileA: string;
  fileB: string;
  sharedSymbols: string[];
  contract: string;
  recommendedOrder: string[];
}

export interface CouplingResult {
  pairs: CouplingPair[];
  suggestedEditOrder: string[];
}

export function detectCoupling(targetFiles: string[], fileContents?: Map<string, string>): CouplingResult {
  const pairs: CouplingPair[] = [];

  for (let i = 0; i < targetFiles.length; i++) {
    for (let j = i + 1; j < targetFiles.length; j++) {
      const fileA = targetFiles[i];
      const fileB = targetFiles[j];
      const contentA = fileContents?.get(fileA) || "";
      const contentB = fileContents?.get(fileB) || "";

      // Detectar imports mutuos
      const aImportsB = contentA.includes(fileB.replace(/\.(ts|tsx|js)$/, ""));
      const bImportsA = contentB.includes(fileA.replace(/\.(ts|tsx|js)$/, ""));

      if (aImportsB || bImportsA) {
        const symbols: string[] = [];
        // Buscar símbolos exportados/importados
        const exportMatchA = contentA.match(/export\s+(const|function|class|interface|type)\s+(\w+)/g);
        const importMatchB = contentB.match(/import\s*\{[^}]+\}\s*from\s*["'][^"']*["']/g);

        if (aImportsB && importMatchB) {
          symbols.push(`${path.basename(fileA)} → ${path.basename(fileB)}`);
        }
        if (bImportsA && exportMatchA) {
          const names = exportMatchA.map((m) => m.split(/\s+/)[2]).filter(Boolean);
          symbols.push(...names.slice(0, 5));
        }

        const contract = aImportsB
          ? `${path.basename(fileA)} depende de exports de ${path.basename(fileB)}. Cambios en ${path.basename(fileB)} requieren actualizar ${path.basename(fileA)}.`
          : `${path.basename(fileB)} depende de exports de ${path.basename(fileA)}. Cambios en ${path.basename(fileA)} requieren actualizar ${path.basename(fileB)}.`;

        const order = aImportsB ? [fileB, fileA] : [fileA, fileB];

        pairs.push({
          fileA,
          fileB,
          sharedSymbols: symbols.length > 0 ? symbols : ["(import detectado)"],
          contract,
          recommendedOrder: order,
        });
      }
    }
  }

  // Orden topológico simple: los archivos sin dependencias entrantes primero
  const ordered = new Set<string>();
  for (const pair of pairs) {
    ordered.add(pair.recommendedOrder[0]);
    ordered.add(pair.recommendedOrder[1]);
  }
  // Añadir archivos sin acoplamiento al final
  for (const f of targetFiles) {
    ordered.add(f);
  }

  return {
    pairs,
    suggestedEditOrder: Array.from(ordered),
  };
}

import * as path from "path";

export function formatCoupling(c: CouplingResult): string {
  if (c.pairs.length === 0) {
    return `≪ MARIDAJE HERMENÉUTICO ≫\n\n✅ No se detectó acoplamiento directo entre los archivos. Se pueden editar en cualquier orden.`;
  }

  let out = `≪ MARIDAJE HERMENÉUTICO ≫\n\n`;
  out += `🔗 ${c.pairs.length} acoplamientos detectados:\n\n`;
  for (const p of c.pairs) {
    out += `📎 ${path.basename(p.fileA)} ↔ ${path.basename(p.fileB)}\n`;
    out += `   Contrato: ${p.contract}\n`;
    out += `   Símbolos: ${p.sharedSymbols.join(", ")}\n`;
    out += `   Orden: ${p.recommendedOrder.map((f) => path.basename(f)).join(" → ")}\n\n`;
  }
  out += `📋 Orden recomendado de edición:\n`;
  c.suggestedEditOrder.forEach((f, i) => {
    out += `   ${i + 1}. ${f}\n`;
  });

  return out;
}
