import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserChats, getChatMessages, getDefaultUserId } from "@/db/queries";
import { auth } from "@/auth";

// Acceso directo: sin sesión se usa la cuenta Catalyst por defecto (app local/LAN)
async function resolveUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id || (await getDefaultUserId());
}

// ─── Evolución temporal del pensamiento ────────────────────────────────
// Línea de tiempo de cómo cambió el pensamiento del usuario sobre un
// concepto a través de sus chats, con detección de contradicciones.

const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";
const ai = new OpenAI({
  baseURL: process.env.AI_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || "",
  timeout: 90_000,
  maxRetries: 1,
});

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function parseJSON(raw: string): { narrative: string; contradictions: string[] } | null {
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(clean.slice(start, end + 1));
    return {
      narrative: String(obj.narrative || "").slice(0, 4000),
      contradictions: Array.isArray(obj.contradictions)
        ? obj.contradictions.slice(0, 5).map((c: unknown) => String(c).slice(0, 300))
        : [],
    };
  } catch {
    return null;
  }
}

// POST { concept } — narra la evolución del pensamiento sobre el concepto
export async function POST(req: NextRequest) {
  const userId = await resolveUserId();

  let concept = "";
  try {
    concept = norm(String((await req.json())?.concept || ""));
  } catch { /* sin cuerpo */ }
  if (!concept) {
    return NextResponse.json({ error: "Falta el concepto" }, { status: 400 });
  }

  const all = await getUserChats(userId);
  const sources = all
    .filter((c) => {
      const ks: string[] = c.concepts ? JSON.parse(c.concepts) : [];
      return ks.some((k) => norm(k) === concept);
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (sources.length < 2) {
    return NextResponse.json(
      { error: "Se necesitan al menos 2 chats con este concepto para trazar evolución" },
      { status: 404 }
    );
  }

  const blocks: string[] = [];
  for (const c of sources.slice(0, 12)) {
    const msgs = await getChatMessages(c.id);
    const firstUser = msgs.find((m) => m.role === "user")?.content?.slice(0, 350) || "";
    blocks.push(
      `[${new Date(c.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}] "${c.title}"\n` +
      `  Resumen: ${c.summary || "(sin resumen)"}\n` +
      `  El usuario planteó: ${firstUser}`
    );
  }

  const prompt = `Eres el motor de Evolución Temporal hermenéutica de Catalyst. Analiza cómo cambió el PENSAMIENTO DEL USUARIO sobre el concepto [[${concept}]] a lo largo del tiempo, según sus conversaciones en orden cronológico:

${blocks.join("\n\n")}

Responde SOLO con JSON válido:
{"narrative": "…", "contradictions": ["…"]}

Reglas:
- narrative: narración en 2ª persona y en español de cómo evolucionó su pensamiento ("En junio explorabas X… para julio pivotaste hacia Y…"). 2-3 párrafos, cita fechas concretas.
- contradictions: lista (0-5) de contradicciones o tensiones detectadas entre lo dicho en fechas distintas, cada una citando ambas fechas. Lista vacía si no hay.`;

  try {
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
    });
    const parsed = parseJSON(completion.choices[0]?.message?.content || "");
    if (!parsed) {
      return NextResponse.json({ error: "La IA no devolvió una evolución válida" }, { status: 502 });
    }
    return NextResponse.json({
      concept,
      timeline: sources.map((c) => ({ id: c.id, title: c.title, date: c.createdAt })),
      narrative: parsed.narrative,
      contradictions: parsed.contradictions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
