import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserChats, createChat, deleteChat } from "@/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await getUserChats(session.user.id);
  return NextResponse.json({ chats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, title, mode, depth, thinking, folder } = await req.json();
    const chat = await createChat({
      id: id || crypto.randomUUID(),
      userId: session.user.id,
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing chat id" }, { status: 400 });
  }

  await deleteChat(id);
  return NextResponse.json({ ok: true });
}
