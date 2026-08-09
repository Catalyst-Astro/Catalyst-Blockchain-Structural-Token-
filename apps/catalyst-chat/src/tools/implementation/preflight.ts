// ─── Preflight Oracle — Estimador de costo/riesgo pre-ejecución ────────
// BELL 13450.50 | Pentetraktys 4D
// Analiza una tarea ANTES de ejecutar tools y estima recursos necesarios.

const MODEL_COST_PER_M_INPUT = parseFloat(
  process.env.MODEL_INPUT_COST_PER_M || "0.14"
);
const MODEL_COST_PER_M_OUTPUT = parseFloat(
  process.env.MODEL_OUTPUT_COST_PER_M || "0.28"
);

// Mapa de keywords → archivos probablemente afectados
const KEYWORD_FILE_MAP: Record<string, string[]> = {
  auth: ["src/auth.ts", "src/app/api/auth/", "src/db/schema.ts"],
  db: ["src/db/schema.ts", "src/db/queries.ts", "src/db/index.ts"],
  schema: ["src/db/schema.ts", "src/db/queries.ts", "src/db/index.ts"],
  api: ["src/app/api/", "src/app/api/chat/route.ts"],
  ui: ["src/app/page.tsx", "src/app/Markdown.tsx", "src/app/layout.tsx"],
  refactor: ["src/"],
  migrar: ["src/db/", "src/app/api/"],
  test: ["src/"],
  build: ["package.json", "next.config.ts", "tsconfig.json"],
  env: [".env", ".env.local", "src/tools/guard.ts"],
  tool: ["src/tools/registry.ts", "src/tools/executor.ts", "src/tools/guard.ts"],
  chat: ["src/app/api/chat/route.ts", "src/app/page.tsx"],
  cli: ["src/tools/", "src/app/api/chat/route.ts"],
  zk: ["src/tools/executor.ts", "docs/zettelkasten/"],
  solidity: ["contracts/"],
  contract: ["contracts/"],
  deploy: ["scripts/", "hardhat.config.ts"],
};

const RISK_KEYWORDS: Record<string, "ALTO" | "MEDIO"> = {
  schema: "ALTO", migrar: "ALTO", auth: "ALTO", env: "ALTO",
  db: "ALTO", delete: "ALTO", borrar: "ALTO", rm: "ALTO",
  refactor: "MEDIO", api: "MEDIO", build: "MEDIO", deploy: "MEDIO",
};

export interface PreflightResult {
  objective: string;
  filesLikelyAffected: string[];
  estCalls: number;
  maxCalls: number;
  estTokensInput: number;
  estTokensOutput: number;
  estCostUsd: number;
  estTimeMin: number;
  riskLevel: "BAJO" | "MEDIO" | "ALTO";
  recommendation: string;
  askConfirmation: boolean;
}

export function estimateTaskComplexity(taskDescription: string): PreflightResult {
  const descLower = taskDescription.toLowerCase();

  // Detectar keywords y mapear a archivos
  const affected = new Set<string>();
  for (const [keyword, files] of Object.entries(KEYWORD_FILE_MAP)) {
    if (descLower.includes(keyword)) {
      files.forEach((f) => affected.add(f));
    }
  }
  const filesList = Array.from(affected).slice(0, 10);

  // Estimar tool calls: 1 por archivo + 2 extra (exploración + verificación)
  const estCalls = Math.min(filesList.length + 2, 50);
  const maxCalls = parseInt(process.env.AGENT_MAX_CALLS || "15", 10);

  // Tokens: ~1000 tokens por archivo (promedio lectura + edición)
  const estTokensInput = filesList.length * 1000 + 500;
  const estTokensOutput = filesList.length * 500 + 300;

  // Costo USD
  const costInput = (estTokensInput / 1_000_000) * MODEL_COST_PER_M_INPUT;
  const costOutput = (estTokensOutput / 1_000_000) * MODEL_COST_PER_M_OUTPUT;
  const estCostUsd = costInput + costOutput;

  // Tiempo: ~12s por tool call
  const estTimeMin = (estCalls * 12) / 60;

  // Riesgo
  let riskLevel: "BAJO" | "MEDIO" | "ALTO" = "BAJO";
  for (const [keyword, level] of Object.entries(RISK_KEYWORDS)) {
    if (descLower.includes(keyword) && level === "ALTO") {
      riskLevel = "ALTO";
      break;
    }
    if (descLower.includes(keyword) && level === "MEDIO") {
      riskLevel = "MEDIO";
    }
  }

  // Recomendación
  let recommendation: string;
  let askConfirmation: boolean;
  if (riskLevel === "ALTO") {
    recommendation = "⚠️ Tarea de ALTO riesgo. Se recomienda code_zazen antes de ejecutar y confirmación explícita del usuario en cada fase.";
    askConfirmation = true;
  } else if (riskLevel === "MEDIO") {
    recommendation = "Tarea de riesgo medio. Ejecutar con supervisión. Si toca schema o auth, validar con tests después.";
    askConfirmation = filesList.length > 3;
  } else {
    recommendation = "Tarea de bajo riesgo. Ejecución directa segura. Se recomienda run_build al finalizar.";
    askConfirmation = false;
  }

  return {
    objective: taskDescription.slice(0, 200),
    filesLikelyAffected: filesList,
    estCalls,
    maxCalls,
    estTokensInput,
    estTokensOutput,
    estCostUsd: Math.round(estCostUsd * 10000) / 10000,
    estTimeMin: Math.round(estTimeMin * 10) / 10,
    riskLevel,
    recommendation,
    askConfirmation,
  };
}

export function formatPreflight(r: PreflightResult): string {
  const riskEmoji = r.riskLevel === "ALTO" ? "🔴" : r.riskLevel === "MEDIO" ? "🟡" : "🟢";
  return (
    `≪ ORÁCULO DE COSTO ≫\n\n` +
    `🎯 Objetivo: ${r.objective}\n` +
    `📁 Archivos afectados estimados: ${r.filesLikelyAffected.length}\n` +
    r.filesLikelyAffected.map((f) => `   - ${f}`).join("\n") + "\n\n" +
    `📊 ESTIMACIONES:\n` +
    `   🔧 Tool calls: ${r.estCalls} / ${r.maxCalls} (límite)\n` +
    `   🪙 Tokens: ~${r.estTokensInput}K in + ~${r.estTokensOutput}K out\n` +
    `   💰 Costo: $${r.estCostUsd.toFixed(4)} USD (DeepSeek)\n` +
    `   ⏱️  Tiempo: ${r.estTimeMin} min\n` +
    `   ${riskEmoji} Riesgo: ${r.riskLevel}\n\n` +
    `💡 Recomendación: ${r.recommendation}\n` +
    `✅ ¿Proceder? ${r.askConfirmation ? "(requiere confirmación)" : "(ejecución directa)"}`
  );
}
