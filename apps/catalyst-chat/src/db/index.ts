import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("catalyst.db");

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Initialize tables on first import
export function initDB() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER,
      image TEXT
    );
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT
    );
    CREATE TABLE IF NOT EXISTS session (
      sessionToken TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verificationToken (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New chat',
      mode TEXT NOT NULL DEFAULT 'catalyst',
      depth TEXT NOT NULL DEFAULT 'surface',
      thinking TEXT NOT NULL DEFAULT 'off',
      folder TEXT NOT NULL DEFAULT 'General',
      summary TEXT,
      concepts TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS message (
      id TEXT PRIMARY KEY,
      chatId TEXT NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      thinking TEXT,
      citations TEXT,
      tool_calls TEXT,
      feedback TEXT,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS note (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      concept TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);
  // Migración para bases existentes: columnas hermenéuticas (summary/concepts)
  for (const col of ["summary", "concepts"]) {
    try {
      sqlite.exec(`ALTER TABLE chat ADD COLUMN ${col} TEXT;`);
    } catch {
      /* la columna ya existe */
    }
  }
  // Migración: tool_calls en message (Catalyst CLI)
  try {
    sqlite.exec(`ALTER TABLE message ADD COLUMN tool_calls TEXT;`);
  } catch {
    /* la columna ya existe */
  }
}

// Auto-init on module load
initDB();
