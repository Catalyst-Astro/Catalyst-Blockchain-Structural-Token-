import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserChats, createChat, deleteChat, getDefaultUserId } from "@/db/queries";

// Acceso directo: sin sesión se usa la cuenta Catalyst por defecto (app local/LAN)
async function resolveUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id || (await getDefaultUserId());
}

export async function GET() {
  const userId = await resolveUserId();
  const chats = await getUserChats(userId);
  return NextResponse.json({ chats });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId();

  try {
    const { id, title, mode, depth, thinking, folder } = await req.json();
    const chat = await createChat({
      id: id || crypto.randomUUID(),
      userId,
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

export async function DELETE(req: NextRequest) {
  await resolveUserId();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing chat id" }, { status: 400 });
  }

  await deleteChat(id);
  return NextResponse.json({ ok: true });
}
