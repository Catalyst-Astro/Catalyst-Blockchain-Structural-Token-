// ─── Pentapilot — Orquestador 5 fases Pentetraktys ────────────────────
// BELL 13450.50 | Pentetraktys 4D
// Divide tareas complejas en 5 fases con checkpoints de usuario.

export type Pentafase = "TESIS" | "ANTITESIS" | "SINTESIS" | "CONCLUSION" | "HYBRYS";

export interface PentaStep {
  phase: Pentafase;
  title: string;
  description: string;
  tools: string[];
  expectedOutput: string;
}

export interface PentaPlan {
  task: string;
  files: string[];
  steps: PentaStep[];
}

export function planPentapilot(taskDescription: string, files: string[]): PentaPlan {
  const steps: PentaStep[] = [
    {
      phase: "TESIS",
      title: "Definición del objetivo",
      description: `Clarificar exactamente qué se quiere lograr: "${taskDescription.slice(0, 120)}". Identificar archivos involucrados y estado actual.`,
      tools: ["list_dir", "read_file", "grep"],
      expectedOutput: "Lista precisa de archivos a modificar y su estado actual.",
    },
    {
      phase: "ANTITESIS",
      title: "Identificación de riesgos",
      description: "Detectar qué puede fallar: dependencias rotas, imports huérfanos, tests existentes que fallarán, cambios en schema que requieren migración.",
      tools: files.length > 1 ? ["pair_designer", "grep", "git_diff"] : ["grep", "git_diff"],
      expectedOutput: "Lista de riesgos concretos con archivos afectados.",
    },
    {
      phase: "SINTESIS",
      title: "Diseño de la solución",
      description: "Proponer la solución concreta: qué cambios en qué archivos, en qué orden, con qué precauciones. Plan de edición paso a paso.",
      tools: ["edit_file", "write_file"],
      expectedOutput: "Plan de edición detallado listo para ejecutar.",
    },
    {
      phase: "CONCLUSION",
      title: "Ejecución",
      description: "Aplicar los cambios según el plan. Cada archivo se edita en el orden recomendado. Verificar compilación después de cada bloque.",
      tools: ["edit_file", "write_file", "run_build", "run_test"],
      expectedOutput: "Cambios aplicados y verificados (build OK, tests OK).",
    },
    {
      phase: "HYBRYS",
      title: "Verificación de calidad",
      description: "Auto-crítica final: ¿qué se asumió? ¿qué no se verificó? ¿hay contradicciones con decisiones previas? ¿los tests cubren los cambios?",
      tools: ["confession", "memory_thread", "run_test", "git_diff"],
      expectedOutput: "Confesión de incertidumbres, registro de decisión, diff final para revisión.",
    },
  ];

  return { task: taskDescription, files, steps };
}

export function formatPentaPlan(p: PentaPlan): string {
  const icons: Record<Pentafase, string> = {
    TESIS: "📌", ANTITESIS: "⚠️", SINTESIS: "◆", CONCLUSION: "✓", HYBRYS: "Δ",
  };

  let out = `Δ PLAN PENTAPILOT — 5 FASES\n\n`;
  out += `🎯 Tarea: ${p.task.slice(0, 150)}\n`;
  out += `📁 Archivos: ${p.files.length > 0 ? p.files.join(", ") : "(por determinar)"}\n\n`;
  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  for (const step of p.steps) {
    out += `${icons[step.phase]} FASE ${p.steps.indexOf(step) + 1}: ${step.phase} — ${step.title}\n`;
    out += `   ${step.description}\n`;
    out += `   🔧 Tools: ${step.tools.join(", ")}\n`;
    out += `   📤 Output esperado: ${step.expectedOutput}\n\n`;
  }

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  out += `⏯️  Cada fase requiere confirmación del usuario para continuar.\n`;
  out += `🛑 En cualquier momento: "detener" para pausar y guardar progreso.`;

  return out;
}
