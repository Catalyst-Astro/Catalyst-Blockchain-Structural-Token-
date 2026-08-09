import { NextRequest, NextResponse } from "next/server";
import { getChatMessages, saveMessage, updateChat } from "@/db/queries";

// Acceso directo sin login (app local/LAN) — sin candado de sesión

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const msgs = await getChatMessages(id);
  return NextResponse.json({ messages: msgs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;
  try {
    const { id, role, content, thinking, citations, feedback, toolCalls } =
      await req.json();
    const msg = await saveMessage({
      id: id || crypto.randomUUID(),
      chatId,
      role,
      content,
      thinking,
      citations: citations ? JSON.stringify(citations) : undefined,
      toolCalls: toolCalls ? JSON.stringify(toolCalls) : undefined,
      feedback,
    });
    return NextResponse.json({ message: msg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;
  try {
    const { title, mode, depth, thinking, folder } = await req.json();
    const chat = await updateChat(chatId, {
      title,
      mode,
      depth,
      thinking,
      folder,
    });
    return NextResponse.json({ chat });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
