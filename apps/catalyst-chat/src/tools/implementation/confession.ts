// ─── Confession — Auto-crítica post-tarea ─────────────────────────────
// BELL 13450.50 | Pentetraktys 4D
// Después de editar archivos, el agente confiesa sus incertidumbres.

export interface ConfessionResult {
  uncertainties: string[];
  assumptions: string[];
  riskPoints: string[];
  suggestedTests: string[];
  confidenceScore: number; // 0-1
}

const RISK_PATTERNS: Array<{ pattern: RegExp; risk: string; test: string }> = [
  { pattern: /schema\.ts/i, risk: "Cambio en schema de BD sin verificar migración", test: "Verificar que queries.ts y migrations estén sincronizados" },
  { pattern: /auth/i, risk: "Cambio en autenticación sin verificar todos los flujos", test: "Probar login, logout, refresh token" },
  { pattern: /api\//i, risk: "Cambio en API sin test de integración", test: "curl o test de integración en el endpoint modificado" },
  { pattern: /\.env/i, risk: "Cambio en variables de entorno sin documentar", test: "Verificar .env.example actualizado" },
  { pattern: /route\.ts/i, risk: "Cambio en ruta sin verificar CORS/middleware", test: "Probar la ruta desde cliente" },
  { pattern: /page\.tsx/i, risk: "Cambio en UI sin verificar renderizado", test: "Test de componente o smoke test visual" },
  { pattern: /guard\.ts/i, risk: "Cambio en seguridad sin revisar bypass", test: "Test de seguridad: intentar path traversal, comando bloqueado" },
];

export function auditChanges(filesChanged: string[], originalTask: string): ConfessionResult {
  const uncertainties: string[] = [];
  const assumptions: string[] = [];
  const riskPoints: string[] = [];
  const suggestedTests: string[] = [];

  for (const file of filesChanged) {
    for (const { pattern, risk, test } of RISK_PATTERNS) {
      if (pattern.test(file)) {
        riskPoints.push(`${file}: ${risk}`);
        if (!suggestedTests.includes(test)) {
          suggestedTests.push(test);
        }
      }
    }
  }

  // Incertidumbres estándar
  if (filesChanged.length > 0) {
    uncertainties.push(`No se verificó que los cambios no rompan imports en otros archivos`);
    uncertainties.push(`No se ejecutó test suite completa — posible regresión no detectada`);
  }
  if (filesChanged.length > 3) {
    uncertainties.push(`Múltiples archivos modificados (${filesChanged.length}) — mayor superficie de error`);
  }

  // Suposiciones
  assumptions.push(`Se asume que el tipo de cambio solicitado es el correcto para el objetivo: "${originalTask.slice(0, 80)}"`);
  assumptions.push(`Se asume que las dependencias externas (APIs, DB) no cambiaron su interfaz`);
  if (!originalTask.toLowerCase().includes("test")) {
    assumptions.push(`Se asume que no se requieren nuevos tests (la tarea no los menciona)`);
  }

  // Confidence score: baja si hay muchos archivos o riesgos
  let confidence = 0.85;
  if (riskPoints.length > 2) confidence -= 0.15;
  if (filesChanged.length > 5) confidence -= 0.1;
  if (filesChanged.length === 0) confidence = 0.9;
  confidence = Math.max(0.3, Math.min(0.95, confidence));

  return {
    uncertainties,
    assumptions,
    riskPoints,
    suggestedTests,
    confidenceScore: Math.round(confidence * 100) / 100,
  };
}

export function formatConfession(c: ConfessionResult, filesChanged: string[]): string {
  const confEmoji = c.confidenceScore > 0.8 ? "😌" : c.confidenceScore > 0.6 ? "😬" : "😰";
  let out = `≪ CONFESIÓN POST-TAREA ≫\n\n`;
  out += `${confEmoji} Completé la tarea (${filesChanged.length} archivos modificados)\n`;
  out += `📊 Confianza: ${(c.confidenceScore * 100).toFixed(0)}%\n\n`;

  if (c.uncertainties.length > 0) {
    out += `❓ NO ENTIENDO / NO VERIFIQUÉ:\n`;
    c.uncertainties.forEach((u) => (out += `   - ${u}\n`));
    out += `\n`;
  }

  if (c.assumptions.length > 0) {
    out += `🤔 ASUMO QUE:\n`;
    c.assumptions.forEach((a) => (out += `   - ${a}\n`));
    out += `\n`;
  }

  if (c.riskPoints.length > 0) {
    out += `⚠️ RIESGOS POTENCIALES:\n`;
    c.riskPoints.forEach((r) => (out += `   - ${r}\n`));
    out += `\n`;
  }

  if (c.suggestedTests.length > 0) {
    out += `🧪 TESTS SUGERIDOS:\n`;
    c.suggestedTests.forEach((t) => (out += `   - ${t}\n`));
  }

  return out;
}
