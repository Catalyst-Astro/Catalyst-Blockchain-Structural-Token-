import { db } from "./index";
import { chats, messages } from "./schema";
import { eq, desc, and } from "drizzle-orm";

// ─── Chat CRUD ─────────────────────────────────────────────────────────

export async function getUserChats(userId: string) {
  return db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .all();
}

export async function getChatById(chatId: string) {
  return db.select().from(chats).where(eq(chats.id, chatId)).get();
}

export async function createChat(chat: {
  id: string;
  userId: string;
  title?: string;
  mode?: string;
  depth?: string;
  thinking?: string;
  folder?: string;
}) {
  const now = new Date();
  return db
    .insert(chats)
    .values({
      id: chat.id,
      userId: chat.userId,
      title: chat.title || "New chat",
      mode: chat.mode || "catalyst",
      depth: chat.depth || "surface",
      thinking: chat.thinking || "off",
      folder: chat.folder || "General",
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

export async function updateChat(
  chatId: string,
  data: { title?: string; mode?: string; depth?: string; thinking?: string; folder?: string }
) {
  return db
    .update(chats)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(chats.id, chatId))
    .returning()
    .get();
}

export async function deleteChat(chatId: string) {
  return db.delete(chats).where(eq(chats.id, chatId)).run();
}

// ─── Message CRUD ──────────────────────────────────────────────────────

export async function getChatMessages(chatId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt)
    .all();
}

export async function saveMessage(msg: {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  citations?: string;
  feedback?: string;
}) {
  return db
    .insert(messages)
    .values({
      id: msg.id,
      chatId: msg.chatId,
      role: msg.role,
      content: msg.content,
      thinking: msg.thinking,
      citations: msg.citations,
      feedback: msg.feedback,
      createdAt: new Date(),
    })
    .returning()
    .get();
}

export async function updateMessageFeedback(
  messageId: string,
  feedback: "up" | "down"
) {
  return db
    .update(messages)
    .set({ feedback })
    .where(eq(messages.id, messageId))
    .run();
}

// ─── Bulk operations ───────────────────────────────────────────────────

export async function importChats(
  userId: string,
  importedChats: Array<{
    id: string;
    title: string;
    date: string;
    mode: string;
    depth: string;
    thinking: string;
    folder: string;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      thinking?: string;
      feedback?: string;
    }>;
  }>
) {
  for (const chat of importedChats) {
    await createChat({
      id: chat.id,
      userId,
      title: chat.title,
      mode: chat.mode,
      depth: chat.depth,
      thinking: chat.thinking,
      folder: chat.folder,
    });
    for (let i = 0; i < chat.messages.length; i++) {
      const m = chat.messages[i];
      await saveMessage({
        id: m.id || `${chat.id}_msg_${i}`,
        chatId: chat.id,
        role: m.role,
        content: m.content,
        thinking: m.thinking,
        feedback: m.feedback,
      });
    }
  }
  return { imported: importedChats.length };
}
