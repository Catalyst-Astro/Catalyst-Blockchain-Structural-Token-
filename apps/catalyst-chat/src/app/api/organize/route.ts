import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getUserChats, getChatMessages, updateChat, getDefaultUserId } from "@/db/queries";
import { auth } from "@/auth";

// Acceso directo: sin sesión se usa la cuenta Catalyst por defecto (app local/LAN)
async function resolveUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id || (await getDefaultUserId());
}

// ─── Motor hermenéutico Zettelkasten ───────────────────────────────────
// Clasifica cada chat con IA (carpeta + conceptos atómicos + resumen) y
// calcula los enlaces bidireccionales entre chats por conceptos compartidos,
// al estilo Obsidian. Mismo proveedor configurable que /api/chat.

const AI_MODEL = process.env.AI_MODEL || "deepseek-chat";
const ai = new OpenAI({
  baseURL: process.env.AI_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || "",
  timeout: 60_000,
  maxRetries: 1,
});

type Classified = { folder: string; concepts: string[]; summary: string };

// Normaliza un concepto para el emparejamiento (minúsculas, sin acentos)
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Extrae JSON de una respuesta de modelo (tolera <think>…</think> de R1 y texto extra)
function parseJSON(raw: string): Classified | null {
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(clean.slice(start, end + 1));
    if (!obj || typeof obj !== "object") return null;
    return {
      folder: String(obj.folder || "General").slice(0, 40),
      concepts: Array.isArray(obj.concepts)
        ? obj.concepts.slice(0, 7).map((c: unknown) => norm(String(c)).slice(0, 40)).filter(Boolean)
        : [],
      summary: String(obj.summary || "").slice(0, 400),
    };
  } catch {
    return null;
  }
}

async function classifyChat(
  title: string,
  excerpt: string,
  folders: string[]
): Promise<Classified | null> {
  const prompt = `Eres el motor hermenéutico Zettelkasten de Catalyst. Analiza este chat y clasifícalo.

CARPETAS EXISTENTES: ${folders.join(", ")}

CHAT — título: "${title}"
${excerpt}

Responde SOLO con JSON válido, sin explicación:
{"folder": "…", "concepts": ["…"], "summary": "…"}

Reglas:
- folder: la carpeta existente que mejor encaje, o propone una nueva (1-2 palabras, español, capitalizada)
- concepts: 3 a 7 conceptos atómicos Zettelkasten (minúsculas, singular, español) — los temas esenciales del chat
- summary: resumen hermenéutico de 1-2 frases en español`;

  try {
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.2,
    });
    return parseJSON(completion.choices[0]?.message?.content || "");
  } catch {
    return null;
  }
}

// Enlaces chat↔chat por conceptos compartidos (peso = # de conceptos en común)
function buildLinks(
  rows: Array<{ id: string; concepts: string[] }>
): Array<{ source: string; target: string; shared: string[]; weight: number }> {
  const links = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = new Set(rows[i].concepts.map(norm));
      const shared = rows[j].concepts.map(norm).filter((c) => a.has(c));
      if (shared.length > 0) {
        links.push({
          source: rows[i].id,
          target: rows[j].id,
          shared,
          weight: shared.length,
        });
      }
    }
  }
  return links;
}

function toGraph(chats: Awaited<ReturnType<typeof getUserChats>>) {
  const rows = chats.map((c) => ({
    id: c.id,
    title: c.title,
    folder: c.folder,
    summary: c.summary || "",
    concepts: c.concepts ? (JSON.parse(c.concepts) as string[]) : [],
  }));
  return { chats: rows, links: buildLinks(rows) };
}

// GET — grafo actual (sin re-clasificar)
export async function GET() {
  const userId = await resolveUserId();
  const chats = await getUserChats(userId);
  return NextResponse.json(toGraph(chats));
}

// POST — clasifica con IA: { chatId? } un solo chat, { force? } re-clasifica todo
export async function POST(req: NextRequest) {
  const userId = await resolveUserId();

  let chatId: string | undefined, force = false;
  try {
    const body = await req.json();
    chatId = body?.chatId;
    force = !!body?.force;
  } catch {
    /* cuerpo vacío = organizar todo lo pendiente */
  }

  const all = await getUserChats(userId);
  const folders = [
    ...new Set([
      "General", "Investigación", "Código", "Creativo", "Negocios", "Personal",
      ...all.map((c) => c.folder),
    ]),
  ];

  const targets = all.filter((c) => {
    if (chatId) return c.id === chatId;
    return force || !c.concepts;
  });

  let organized = 0;
  for (const chat of targets) {
    const msgs = await getChatMessages(chat.id);
    if (msgs.length === 0) continue;
    const userMsgs = msgs.filter((m) => m.role === "user").slice(0, 3);
    const lastAI = [...msgs].reverse().find((m) => m.role === "assistant");
    const excerpt = [
      ...userMsgs.map((m) => `USUARIO: ${m.content.slice(0, 500)}`),
      lastAI ? `ASISTENTE: ${lastAI.content.slice(0, 800)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await classifyChat(chat.title, excerpt, folders);
    if (!result || result.concepts.length === 0) continue;

    if (!folders.includes(result.folder)) folders.push(result.folder);
    await updateChat(chat.id, {
      folder: result.folder,
      summary: result.summary,
      concepts: JSON.stringify(result.concepts),
    });
    organized++;
  }

  const updated = await getUserChats(userId);
  return NextResponse.json({ ...toGraph(updated), organized });
}
