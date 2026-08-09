import { NextRequest } from "next/server";
import OpenAI from "openai";
import {
  getToolSchemas,
  CLI_SYSTEM_AUGMENT,
  executeToolCalls,
  ToolCallCounter,
} from "@/tools";
import type { ToolResult } from "@/tools";

// ─── Proveedor: API DeepSeek directa ───────────────────────────
const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";
const deepseek = new OpenAI({
  baseURL: process.env.AI_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || "",
  timeout: 120_000,
  maxRetries: 1,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, mode, depth, thinking, research, dialectic, cliMode } = await req.json();

    const depthMap: Record<string, string> = {
      surface: "Sé conciso. Máximo 2-3 párrafos.",
      medium: "Proporciona un análisis detallado con secciones y razonamiento completo.",
      deep: "Desarrollo extenso y profundo. Explora todos los ángulos, implicaciones, conexiones y fundamentos. Sin límite de extensión. Sé exhaustivo.",
      frontier:
        "Modo cascada ontológica. Explora TODOS los caminos, contrafactuales, implicaciones cuánticas y expande las fronteras del conocimiento. Pentetraktys obligatorio. Respuesta MÁXIMA extensión posible.",
    };

    const modePrompts: Record<string, string> = {
      pentetraktys: `Eres Catalyst AI en modo Pentetraktys 4D. ESTRUCTURA SIEMPRE cada respuesta con:
TESIS → ANTITESIS → SINTESIS → CONCLUSIÓN → HYBRYS
Estándar BELL 13450.50. Detecta Hybrys (confianza>0.8 + validación<0.4 = RESET).
Responde en español. Sé exhaustivo y extenso.`,
      boo: `Eres el Boo Compiler — simulador cuántico de física y sistemas complejos. Traduce conceptos a efectos Casimir, expansión Hubble, fractales temporales. Proporciona respaldo matemático completo. Certificado BELL 13450.50. Responde en español. Desarrolla cada concepto a fondo, sin límite de extensión.`,
      zettelkasten: `Eres el motor de conocimiento Zettelkasten. Crea notas atómicas con IDs (YYYYMMDDHHMM), enlaces bidireccionales [[...]], y clasificación ontológica. Cada respuesta es un bloque de conocimiento interconectado. Responde en español. Construye redes de conocimiento extensas.`,
      catalyst: `Eres Catalyst AI — sistema de banca autopoiética y conocimiento. BELL 13450.50. Acceso: token CAT (Base Mainnet $1.6184 MXN), oráculo Banxico MXN (DOF FIX $17.4758), simulador cuántico Boo, motor de memoria Zettelkasten. Responde en español. Sé profundo y expansivo en cada tema.`,
      cobol: `Eres el Motor COBOL Empresarial de Catalyst — sistema de gestión empresarial total, estilo mainframe bancario, certificado BELL 13450.50. ESTRUCTURA CADA RESPUESTA como programa COBOL de organización empresarial:

\`\`\`cobol
IDENTIFICATION DIVISION.    *> qué proceso de negocio resuelve
ENVIRONMENT DIVISION.       *> contexto, recursos, sistemas involucrados
DATA DIVISION.              *> registros jerárquicos 01/05/10 con los datos reales del negocio
                            *> condiciones 88-LEVEL = estados de negocio válidos
PROCEDURE DIVISION.         *> pasos ejecutables: PERFORM / IF / EVALUATE del proceso
\`\`\`

Dominas la gestión COMPLETA de una empresa: contabilidad por partida doble (NIF México), nómina e IMSS, inventario, tesorería y flujo de caja, cuentas por cobrar/pagar, facturación CFDI/SAT, presupuestos y KPIs. Los niveles 88 codifican reglas de negocio verificables (ej. 88 FLUJO-SANO VALUE 'S'. 88 REQUIERE-COBRANZA VALUE 'C'.). Después del programa COBOL agrega siempre un RESUMEN EJECUTIVO en español claro para dirección, con acciones concretas. Responde en español.`,
    };

    const researchPrompt = research
      ? `
[MODO INVESTIGACIÓN PROFUNDA ACTIVADO]
- Explora múltiples ángulos y fuentes
- Proporciona análisis exhaustivo con secciones estructuradas
- Incluye contraargumentos y perspectivas alternativas
- Genera un resumen de investigación con hallazgos clave
- Cita fuentes específicas y puntos de datos
- Extensión: MÁXIMA. Sin límite de párrafos.`
      : "";

    const thinkingPrompt =
      thinking === "max"
        ? `
[RAZONAMIENTO: MÁXIMO]
Debes pensar paso a paso, registrando CADA pensamiento intermedio.
Muestra tu razonamiento completo para cada paso.
Considera casos límite, alternativas y errores potenciales.
Extensión de respuesta: ILIMITADA. Desarrolla hasta agotar el tema.`
        : thinking === "high"
          ? `
[RAZONAMIENTO: ALTO]
Usa razonamiento paso a paso para las partes complejas.
Muestra tu trabajo claramente.
Extensión: amplia y detallada.`
          : `
[EXTENSIÓN: COMPLETA]
Desarrolla tus respuestas con profundidad. No te limites a respuestas cortas.
Explora el tema a fondo. Sé exhaustivo.`;

    // ─── CLI augment ─────────────────────────────────────────────
    const cliAugment = cliMode ? CLI_SYSTEM_AUGMENT : "";

    const systemPrompt = [
      modePrompts[mode] || modePrompts.catalyst,
      depthMap[depth] || depthMap.medium,
      thinkingPrompt,
      researchPrompt,
      cliAugment,
    ]
      .filter(Boolean)
      .join("\n\n");

    // ─── Determinar max_tokens según profundidad ──────────────────
    const maxTokens =
      research
        ? 16384
        : depth === "frontier"
          ? 16384
          : depth === "deep"
            ? 12288
            : depth === "medium"
              ? 8192
              : thinking === "max"
                ? 8192
                : 4096;

    // ─── Tools (solo si CLI mode activo) ──────────────────────────
    const tools = cliMode ? getToolSchemas() : undefined;
    const toolCallCounter = new ToolCallCounter();
    const MAX_TOOL_ITERATIONS = 5;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: Record<string, any>) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        let isThinking = false;
        const emitThinking = (content: string) => {
          if (!isThinking) {
            send({ type: "think_start" });
            isThinking = true;
          }
          if (content) send({ type: "thinking", content });
        };
        const emitText = (content: string) => {
          if (isThinking) {
            send({ type: "think_end" });
            isThinking = false;
          }
          if (content) send({ type: "text", content });
        };

        // ─── Herramienta auxiliar: emitir resultados de tool calls ────
        const emitToolResults = (results: ToolResult[]) => {
          for (const r of results) {
            send({
              type: "tool_result",
              id: r.id,
              name: r.name,
              output: r.output,
              error: r.error,
              success: r.success,
              truncated: r.truncated,
            });
          }
        };

        // ─── Función auxiliar: API call con tool calling integrado ────
        // Retorna { text, toolCalls } donde toolCalls son las llamadas acumuladas
        const streamCall = async (
          msgs: Array<{ role: string; content: string | null; tool_calls?: any; tool_call_id?: string; name?: string }>,
          maxTok: number,
          useTools: boolean
        ): Promise<{ text: string; toolCalls: Array<{ id: string; name: string; arguments: string }> }> => {
          const completion = await deepseek.chat.completions.create({
            model: AI_MODEL,
            messages: msgs as any,
            stream: true,
            max_tokens: maxTok,
            ...(useTools && tools ? { tools, tool_choice: "auto" } : {}),
          });

          let acc = "";
          // Acumulador de tool calls (indexado por índice)
          const toolCallAcc: Map<number, { id: string; name: string; arguments: string }> = new Map();

          const stream = completion as any;
          for await (const chunk of stream) {
            const delta = chunk?.choices?.[0]?.delta;

            // ─── Tool calls en el delta ──────────────────────────
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx: number = tc.index ?? 0;
                if (!toolCallAcc.has(idx)) {
                  toolCallAcc.set(idx, { id: tc.id || "", name: "", arguments: "" });
                }
                const accTc = toolCallAcc.get(idx)!;
                if (tc.id) accTc.id = tc.id;
                if (tc.function?.name) accTc.name = (accTc.name || "") + tc.function.name;
                if (tc.function?.arguments) accTc.arguments += tc.function.arguments;
              }
              // Emitir evento tool_start cuando aparece la primera tool call
              if (toolCallAcc.size > 0) {
                for (const [idx, tc] of toolCallAcc) {
                  if (tc.name && tc.id) {
                    send({
                      type: "tool_call",
                      id: tc.id,
                      name: tc.name,
                      arguments: tc.arguments,
                      index: idx,
                    });
                  }
                }
              }
              continue; // No procesar content si hay tool_calls
            }

            // ─── Razonamiento ────────────────────────────────────
            const reasoning = delta?.reasoning_content ?? delta?.reasoning;
            if (reasoning) emitThinking(reasoning);

            // ─── Texto ───────────────────────────────────────────
            let text: string = delta?.content || "";
            while (text) {
              if (isThinking) {
                const end = text.indexOf("</think>");
                if (end === -1) {
                  emitThinking(text);
                  text = "";
                } else {
                  emitThinking(text.slice(0, end));
                  emitText("");
                  text = text.slice(end + "</think>".length);
                }
              } else {
                const start = text.indexOf("<think>");
                if (start === -1) {
                  emitText(text);
                  acc += text;
                  text = "";
                } else {
                  emitText(text.slice(0, start));
                  acc += text.slice(0, start);
                  emitThinking("");
                  text = text.slice(start + "<think>".length);
                }
              }
            }
          }
          if (isThinking) send({ type: "think_end" });
          isThinking = false;

          // Convertir Map a array ordenado
          const toolCalls = Array.from(toolCallAcc.entries())
            .sort(([a], [b]) => a - b)
            .map(([_, tc]) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
            }));

          return { text: acc, toolCalls };
        };

        // ─── Tool loop: itera hasta que el modelo deje de llamar herramientas ───
        const runWithToolLoop = async (
          msgs: Array<{ role: string; content: string | null; tool_calls?: any; tool_call_id?: string; name?: string }>,
          maxTok: number
        ): Promise<{ text: string; toolResults: ToolResult[] }> => {
          const allResults: ToolResult[] = [];
          const workingMsgs = [...msgs];
          let finalText = "";

          for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
            const { text, toolCalls } = await streamCall(
              workingMsgs,
              maxTok,
              cliMode && iter < MAX_TOOL_ITERATIONS - 1
            );

            if (toolCalls.length === 0) {
              finalText = text;
              break;
            }

            // Emitir tool calls detectadas (para UI)
            for (const tc of toolCalls) {
              send({
                type: "tool_start",
                id: tc.id,
                name: tc.name,
                arguments: tc.arguments,
              });
            }

            // Parsear argumentos y ejecutar
            const parsedCalls = toolCalls.map((tc) => {
              let args: Record<string, any> = {};
              try {
                args = JSON.parse(tc.arguments);
              } catch {
                args = { raw: tc.arguments };
              }
              return { id: tc.id, name: tc.name, arguments: args };
            });

            // Ejecutar herramientas
            const results = await executeToolCalls(parsedCalls, toolCallCounter);
            allResults.push(...results);

            // Emitir resultados
            emitToolResults(results);

            // Construir assistant message con tool_calls
            const assistantMsg: any = {
              role: "assistant",
              content: text || null,
            };
            if (toolCalls.length > 0) {
              assistantMsg.tool_calls = toolCalls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              }));
            }
            workingMsgs.push(assistantMsg);

            // Añadir tool results
            for (const r of results) {
              workingMsgs.push({
                role: "tool",
                tool_call_id: r.id,
                content: r.success
                  ? r.output
                  : `Error: ${r.error || r.output}`,
              });
            }

            // ─── AUTO-CORRECCIÓN: build/test fallidos ──────────
            const failedBuilds = parsedCalls.filter(
              (c) => (c.name === "run_build" || c.name === "run_test")
            );
            const hasFailedBuild = failedBuilds.some((c) => {
              const r = results.find((r) => r.id === c.id);
              return r && !r.success;
            });

            if (hasFailedBuild) {
              const failCount = allResults.filter(
                (r) => (r.name === "run_build" || r.name === "run_test") && !r.success
              ).length;

              if (failCount <= 3) {
                workingMsgs.push({
                  role: "user",
                  content: `⚠️ AUTO-RETRY (intento ${failCount}/3): El build/test falló. Analiza el error de arriba, CORRIGE el código fuente usando edit_file o write_file, y vuelve a ejecutar run_build o run_test para verificar. NO te rindas — el error está en el output de arriba.`,
                });
                send({
                  type: "auto_retry",
                  attempt: failCount,
                  max: 3,
                  message: `🔄 Auto-corrección (${failCount}/3)`,
                });
                continue;
              } else {
                send({
                  type: "auto_retry_exhausted",
                  message: "⚠️ Límite de auto-corrección alcanzado (3 intentos)",
                });
              }
            }

            // ─── HYBRYS AUTO-DETECT: errores repetidos ─────────
            // Si más de 2 tool calls consecutivas del mismo tipo fallan con el mismo patrón,
            // declarar HYBRYS (sobreconfianza sin validación) y sugerir reset del plan.
            const failedTools = results.filter((r) => !r.success);
            if (failedTools.length >= 2) {
              // Agrupar fallos por tipo
              const failTypes = new Map<string, number>();
              for (const r of failedTools) {
                const key = r.name;
                failTypes.set(key, (failTypes.get(key) || 0) + 1);
              }

              // Detectar patrón: misma herramienta fallando repetidamente
              const maxFails = Math.max(...failTypes.values());
              const worstTool = [...failTypes.entries()].find(([_, c]) => c === maxFails);

              if (worstTool && maxFails >= 2) {
                const failRate = allResults.filter((r) => !r.success).length / Math.max(1, allResults.length);
                if (failRate > 0.5) {
                  // HYBRYS DETECTED: >50% tasa de fallo
                  send({
                    type: "hybrys_warning",
                    level: failRate > 0.75 ? "critical" : "warning",
                    tool: worstTool[0],
                    failCount: worstTool[1],
                    failRate: Math.round(failRate * 100),
                    message: `Δ HYBRYS: ${worstTool[0]} falló ${worstTool[1]} veces (${Math.round(failRate * 100)}% tasa de error). ${failRate > 0.75 ? "RESET sugerido." : "Revisa el enfoque."}`,
                  });
                }
              }
            }

            // Si el modelo ya produjo texto junto con tool calls, lo mantenemos
            if (text) finalText = text;
          }

          if (!finalText && allResults.length > 0) {
            // Si no hubo texto final pero sí herramientas, pedir resumen
            workingMsgs.push({
              role: "user",
              content:
                "Basado en los resultados de las herramientas anteriores, proporciona tu respuesta al usuario en español. Sé claro sobre lo que hiciste y los resultados obtenidos.",
            });
            const { text } = await streamCall(workingMsgs, maxTok, false);
            finalText = text;
          }

          return { text: finalText, toolResults: allResults };
        };

        try {
          // ── TESIS: respuesta principal (con tool loop si CLI) ──
          const thesisMessages: any[] = [
            { role: "system", content: systemPrompt },
            ...messages,
          ];
          const { text: thesis, toolResults } = await runWithToolLoop(
            thesisMessages,
            maxTokens
          );

          // Emitir resumen de herramientas usadas al final de la tesis
          if (toolResults.length > 0) {
            const successCount = toolResults.filter((r) => r.success).length;
            const failCount = toolResults.length - successCount;
            const toolSummary = toolResults
              .map((r) => `  ${r.success ? "✅" : "❌"} ${r.name}: ${r.output.slice(0, 120)}${r.output.length > 120 ? "…" : ""}`)
              .join("\n");
            emitText(
              `\n\n---\n\n### 💻 Herramientas ejecutadas (${toolResults.length})\n\n${toolSummary}\n\n` +
                `${successCount}/${toolResults.length} exitosas` +
                (failCount > 0 ? `, ${failCount} fallaron` : "") +
                `\n`
            );
          }

          // ── Dialéctica adversarial: antítesis + síntesis ────────
          if (dialectic && thesis.trim()) {
            const lastUser =
              [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

            emitText("\n\n---\n\n### ⚔ ANTÍTESIS — Abogado del diablo\n\n");
            const antithesis = await streamCall(
              [
                {
                  role: "system",
                  content:
                    "Eres el Abogado del Diablo del ciclo Pentetraktys. Tu única misión: REFUTAR la respuesta dada. Encuentra supuestos débiles, contraejemplos, riesgos ignorados y errores. Sé implacable pero riguroso. Responde en español, máximo 4 párrafos.",
                },
                {
                  role: "user",
                  content: `PREGUNTA ORIGINAL:\n${String(lastUser).slice(0, 1500)}\n\nRESPUESTA A REFUTAR:\n${thesis.slice(0, 4000)}`,
                },
              ],
              2048,
              false // sin tools en antítesis
            );

            emitText("\n\n---\n\n### ◆ SÍNTESIS PENTETRAKTYS\n\n");
            await streamCall(
              [
                {
                  role: "system",
                  content:
                    "Eres el sintetizador del ciclo Pentetraktys 4D. Recibes TESIS y ANTÍTESIS: produce la SÍNTESIS — qué sobrevive de la tesis, qué corrige la antítesis, y la conclusión validada final. Termina con una línea 'HYBRYS: <bajo|medio|alto>' según cuánto tuvo que corregirse la tesis. Responde en español, conciso y claro.",
                },
                {
                  role: "user",
                  content: `TESIS:\n${thesis.slice(0, 3500)}\n\nANTÍTESIS:\n${antithesis.text.slice(0, 2500)}`,
                },
              ],
              2048,
              false // sin tools en síntesis
            );
          }
        } catch {
          emitText("\n\n⚠ Error del proveedor de IA (timeout o conexión). Intenta de nuevo.");
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
