import { NextRequest, NextResponse } from "next/server";

// ─── Diagnóstico de cliente (iPhone/Safari sin consola visible) ────────
// Recibe errores JS del navegador y los imprime en el log del servidor.

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log(`[CLIENTLOG] ${body.slice(0, 800)}`);
  } catch {
    console.log("[CLIENTLOG] (cuerpo ilegible)");
  }
  return NextResponse.json({ ok: true });
}
