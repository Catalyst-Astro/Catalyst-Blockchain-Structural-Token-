import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ─── Medidor de Hybrys ─────────────────────────────────────────────────
// Segundo juicio: puntúa confianza vs. validación de cada respuesta.
// Hybrys = exceso de confianza sin sustento (protocolo Pentetraktys 4D).
// Umbral 15% = WARNING, 30% = CRITICAL (estándar BELL 13450.50).

const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";
const ai = new OpenAI({
  baseURL: process.env.AI_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || "",
  timeout: 45_000,
  maxRetries: 1,
});

function parseJSON(raw: string): { confianza: number; validacion: number; razon: string } | null {
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(clean.slice(start, end + 1));
    const confianza = Math.max(0, Math.min(1, Number(obj.confianza)));
    const validacion = Math.max(0, Math.min(1, Number(obj.validacion)));
    if (Number.isNaN(confianza) || Number.isNaN(validacion)) return null;
    return { confianza, validacion, razon: String(obj.razon || "").slice(0, 200) };
  } catch {
    return null;
  }
}

// POST { question, answer } — juzga la respuesta y devuelve el nivel de Hybrys
// Acceso directo sin login (app local/LAN)
export async function POST(req: NextRequest) {
  const { question, answer } = await req.json();
  if (!answer) {
    return NextResponse.json({ error: "Falta la respuesta a juzgar" }, { status: 400 });
  }

  const prompt = `Eres el Juez de Hybrys del protocolo Pentetraktys 4D (BELL 13450.50). Evalúa esta respuesta de IA con escepticismo profesional:

PREGUNTA:
${String(question || "").slice(0, 1200)}

RESPUESTA A JUZGAR:
${String(answer).slice(0, 4000)}

Responde SOLO con JSON válido:
{"confianza": 0.0-1.0, "validacion": 0.0-1.0, "razon": "…"}

- confianza: qué tan segura/asertiva SUENA la respuesta (tono, ausencia de matices, afirmaciones categóricas)
- validacion: qué tan SUSTENTADA está realmente (evidencia, fuentes, razonamiento verificable, reconocimiento de límites)
- razon: una frase en español explicando el juicio`;

  try {
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.1,
    });
    const parsed = parseJSON(completion.choices[0]?.message?.content || "");
    if (!parsed) {
      return NextResponse.json({ error: "Juicio inválido" }, { status: 502 });
    }

    // Hybrys = brecha entre lo que aparenta y lo que sustenta
    const hybrys = Math.max(0, parsed.confianza - parsed.validacion);
    const nivel = hybrys > 0.3 ? "critical" : hybrys > 0.15 ? "warning" : "ok";

    return NextResponse.json({
      confianza: parsed.confianza,
      validacion: parsed.validacion,
      hybrys: Math.round(hybrys * 100),
      nivel,
      razon: parsed.razon,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
