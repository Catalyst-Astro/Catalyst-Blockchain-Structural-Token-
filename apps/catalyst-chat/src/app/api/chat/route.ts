import { NextRequest } from "next/server";
import OpenAI from "openai";

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { messages, mode, depth, thinking, research } = await req.json();

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

    const systemPrompt = [
      modePrompts[mode] || modePrompts.catalyst,
      depthMap[depth] || depthMap.medium,
      thinkingPrompt,
      researchPrompt,
    ]
      .filter(Boolean)
      .join("\n\n");

    // ─── Determinar max_tokens según profundidad ──────────────────
    const maxTokens =
      research
        ? 16384  // Investigación: máxima extensión
        : depth === "frontier"
          ? 16384
          : depth === "deep"
            ? 12288
            : depth === "medium"
              ? 8192
              : thinking === "max"
                ? 8192
                : 4096;  // Surface con thinking off = 4096 mínimo

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: maxTokens,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let isThinking = false;
        const stream = completion as any;
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta;
          const reasoning = delta?.reasoning_content;
          const text = delta?.content;

          if (reasoning) {
            if (!isThinking) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "think_start" })}\n\n`)
              );
              isThinking = true;
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "thinking", content: reasoning })}\n\n`
              )
            );
          }
          if (text) {
            if (isThinking) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "think_end" })}\n\n`)
              );
              isThinking = false;
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: text })}\n\n`
              )
            );
          }
        }
        if (isThinking)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "think_end" })}\n\n`)
          );
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
