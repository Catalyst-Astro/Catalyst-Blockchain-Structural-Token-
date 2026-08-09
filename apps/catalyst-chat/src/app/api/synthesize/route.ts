import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserChats, getChatMessages, getUserNotes, upsertNote, getDefaultUserId } from "@/db/queries";
import { auth } from "@/auth";

// Acceso directo: sin sesión se usa la cuenta Catalyst por defecto (app local/LAN)
async function resolveUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id || (await getDefaultUserId());
}

// ─── Síntesis Autopoiética ─────────────────────────────────────────────
// La IA relee todos los chats que comparten un concepto Zettelkasten y
// escribe una meta-nota propia — el sistema de conocimiento se construye
// a sí mismo (OSHIRO: el castillo que se construye solo).

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

function parseJSON(raw: string): { title: string; content: string } | null {
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(clean.slice(start, end + 1));
    if (!obj?.title || !obj?.content) return null;
    return { title: String(obj.title).slice(0, 120), content: String(obj.content).slice(0, 6000) };
  } catch {
    return null;
  }
}

// GET — todas las meta-notas del usuario
export async function GET() {
  const userId = await resolveUserId();
  const rows = await getUserNotes(userId);
  return NextResponse.json({
    notes: rows.map((n) => ({
      id: n.id, concept: n.concept, title: n.title, content: n.content,
      sources: JSON.parse(n.sources) as string[],
      createdAt: n.createdAt,
    })),
  });
}

// POST { concept } — sintetiza una meta-nota del concepto dado
export async function POST(req: NextRequest) {
  const userId = await resolveUserId();

  let concept = "";
  try {
    concept = norm(String((await req.json())?.concept || ""));
  } catch { /* sin cuerpo */ }
  if (!concept) {
    return NextResponse.json({ error: "Falta el concepto" }, { status: 400 });
  }

  // Chats fuente: los que comparten el concepto
  const all = await getUserChats(userId);
  const sources = all.filter((c) => {
    const ks: string[] = c.concepts ? JSON.parse(c.concepts) : [];
    return ks.some((k) => norm(k) === concept);
  });
  if (sources.length === 0) {
    return NextResponse.json({ error: "Ningún chat contiene ese concepto" }, { status: 404 });
  }

  // Contexto: título + resumen + fragmento de cada chat fuente
  const blocks: string[] = [];
  for (const c of sources.slice(0, 10)) {
    const msgs = await getChatMessages(c.id);
    const firstUser = msgs.find((m) => m.role === "user")?.content?.slice(0, 400) || "";
    blocks.push(
      `— CHAT "${c.title}" (${new Date(c.createdAt).toLocaleDateString("es-MX")})\n` +
      `  Resumen: ${c.summary || "(sin resumen)"}\n` +
      `  Inicio: ${firstUser}`
    );
  }

  const prompt = `Eres el motor de Síntesis Autopoiética Zettelkasten de Catalyst. Vas a escribir una META-NOTA ATÓMICA que sintetice todo lo que el usuario ha explorado sobre el concepto [[${concept}]] a través de ${sources.length} conversaciones.

FUENTES:
${blocks.join("\n\n")}

Responde SOLO con JSON válido, sin explicación:
{"title": "…", "content": "…"}

Reglas:
- title: título atómico y esencial de la nota (máx 10 palabras, español)
- content: la meta-nota en markdown (2-4 párrafos): qué se sabe del concepto según estas conversaciones, qué patrones emergen entre ellas, qué tensiones o preguntas quedan abiertas. Usa enlaces [[concepto]] cuando menciones otros conceptos. Escribe en español, con profundidad hermenéutica.`;

  try {
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2048,
      temperature: 0.4,
    });
    const parsed = parseJSON(completion.choices[0]?.message?.content || "");
    if (!parsed) {
      return NextResponse.json({ error: "La IA no devolvió una nota válida" }, { status: 502 });
    }

    const note = await upsertNote({
      userId,
      concept,
      title: parsed.title,
      content: parsed.content,
      sources: JSON.stringify(sources.map((c) => c.id)),
    });

    return NextResponse.json({
      note: {
        id: note.id, concept: note.concept, title: note.title, content: note.content,
        sources: JSON.parse(note.sources) as string[],
        createdAt: note.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
