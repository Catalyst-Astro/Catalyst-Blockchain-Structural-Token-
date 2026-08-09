// ─── Code Zazen — Meditación técnica pre-ejecución ────────────────────
// BELL 13450.50 | Pentetraktys 4D
// Antes de ejecutar tareas complejas, presenta 3 caminos alternativos.

export interface ZazenOption {
  title: string;
  approach: string;
  riskLevel: "BAJO" | "MEDIO" | "ALTO";
  pros: string[];
  cons: string[];
}

export interface ZazenResult {
  options: ZazenOption[];
  recommendation: string;
  askUser: boolean;
}

export function reflectOnTask(taskDescription: string): ZazenResult {
  const descLower = taskDescription.toLowerCase();
  const isRisky = /\b(refactor|migrar|schema|auth|delete|borrar|rm|env|deploy)\b/i.test(descLower);

  const options: ZazenOption[] = [
    {
      title: "🐢 Camino Conservador",
      approach: "Cambios mínimos necesarios. Solo tocar lo indispensable. Verificar con build + test después de cada paso.",
      riskLevel: "BAJO",
      pros: ["Menor riesgo de regresión", "Fácil de revertir", "Rápido de validar"],
      cons: ["Puede no resolver el problema de raíz", "Posible deuda técnica"],
    },
    {
      title: "⚡ Camino Directo",
      approach: "Implementación directa de la solución. Editar archivos necesarios y verificar al final.",
      riskLevel: isRisky ? "ALTO" : "MEDIO",
      pros: ["Resolución rápida", "Código limpio sin workarounds"],
      cons: ["Mayor riesgo de romper dependencias", "Requiere revisión cuidadosa post-cambio"],
    },
    {
      title: "🏗️ Camino Arquitectónico",
      approach: "Re-estructurar para mejorar el diseño general. Puede implicar nuevos archivos/módulos.",
      riskLevel: "ALTO",
      pros: ["Mejor diseño a largo plazo", "Elimina deuda técnica", "Más mantenible"],
      cons: ["Mayor tiempo de implementación", "Riesgo de sobre-ingeniería", "Más archivos afectados"],
    },
  ];

  // Si es riesgoso, el camino directo escala a ALTO
  const recommendation = isRisky
    ? "🐢 Conservador — la tarea tiene keywords de riesgo. Mejor ir paso a paso con validación frecuente."
    : "⚡ Directo — la tarea parece acotada. Ejecución directa con verificación final.";

  return {
    options,
    recommendation,
    askUser: isRisky,
  };
}

export function formatZazen(r: ZazenResult): string {
  let out = `≪ ZEN — MEDITACIÓN TÉCNICA ≫\n\n`;
  out += `🧘 Antes de ejecutar, considera 3 caminos:\n\n`;
  for (const opt of r.options) {
    const riskEmoji = opt.riskLevel === "ALTO" ? "🔴" : opt.riskLevel === "MEDIO" ? "🟡" : "🟢";
    out += `${opt.title} ${riskEmoji}\n`;
    out += `   Enfoque: ${opt.approach}\n`;
    out += `   ✅ ${opt.pros.join(" · ")}\n`;
    out += `   ⚠️ ${opt.cons.join(" · ")}\n\n`;
  }
  out += `💡 Recomendación: ${r.recommendation}\n`;
  if (r.askUser) {
    out += `\n⚠️ Esta tarea requiere confirmación. ¿Cuál camino eliges? [1/2/3]`;
  }
  return out;
}
