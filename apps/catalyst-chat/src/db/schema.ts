import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Auth.js v5 required tables ───────────────────────────────────────

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

// ─── Catalyst Chat tables ─────────────────────────────────────────────

export const chats = sqliteTable("chat", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New chat"),
  mode: text("mode").notNull().default("catalyst"),
  depth: text("depth").notNull().default("surface"),
  thinking: text("thinking").notNull().default("off"),
  folder: text("folder").notNull().default("General"),
  summary: text("summary"), // resumen hermenéutico de 1-2 frases (generado por IA)
  concepts: text("concepts"), // JSON stringified: conceptos Zettelkasten atómicos
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const messages = sqliteTable("message", {
  id: text("id").primaryKey(),
  chatId: text("chatId")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  thinking: text("thinking"),
  citations: text("citations"), // JSON stringified
  toolCalls: text("tool_calls"), // JSON stringified — Catalyst CLI
  feedback: text("feedback"), // 'up' | 'down' | null
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
});

// Meta-notas autopoiéticas: notas que la IA escribe por sí misma
// sintetizando todos los chats que comparten un concepto Zettelkasten
export const notes = sqliteTable("note", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  concept: text("concept").notNull(), // concepto normalizado que sintetiza
  title: text("title").notNull(),
  content: text("content").notNull(), // markdown de la meta-nota
  sources: text("sources").notNull(), // JSON stringified: ids de chats fuente
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
});
