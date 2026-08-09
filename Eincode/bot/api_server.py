"""
═══════════════════════════════════════════════════════════════════════════
CATALYST THREEMA BOT — API Server (FastAPI)
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

Endpoints:
  POST /api/chat            — Chat REST (JSON)
  GET  /api/chat/stream     — Chat SSE streaming
  POST /api/threema/webhook — Threema Gateway webhook receiver
  GET  /api/threema/send    — Enviar mensaje via Threema Gateway
  GET  /api/health          — Health check
  GET  /api/status          — Bot status + stats
  GET  /api/convs           — Listar conversaciones
  DELETE /api/convs/{id}    — Borrar conversación

Uso:
  python api_server.py                    # Sin Threema (solo REST)
  THREEMA_ID=*MYID THREEMA_SECRET=xyz \  # Con Threema Gateway
    python api_server.py
═══════════════════════════════════════════════════════════════════════════
"""

import os, sys, json, hmac, hashlib, logging
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Agregar el directorio padre al path para importar catalyst_bot
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger("catalyst-api")

from catalyst_bot import (
    CatalystBot, Mode, Depth, Thinking, BotResponse,
    BELL, VERSION, MODES, DEPTHS,
)

# ─── Orchestrator (opcional — si está corriendo en :9000) ────
orchestrator = None
try:
    from orchestrator import CatalystOrchestrator, TokenManager, LinguisticGamesEngine
    orchestrator = CatalystOrchestrator()
    log.info(f"Orchestrator conectado: {orchestrator.stats()['total_messages_logged']} mensajes en log")
except Exception as e:
    log.debug(f"Orchestrator no disponible: {e}")

# ═══════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════

API_KEY = os.getenv("CATALYST_API_KEY", "")
THREEMA_ID = os.getenv("THREEMA_ID", "")
THREEMA_SECRET = os.getenv("THREEMA_SECRET", "")
THREEMA_PRIVATE_KEY = os.getenv("THREEMA_PRIVATE_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", os.getenv("AI_API_KEY", ""))

# Inicializar bot
bot = CatalystBot(api_key=DEEPSEEK_API_KEY)

# Inicializar Threema Gateway si hay credenciales
threema = None
if THREEMA_ID and THREEMA_SECRET:
    try:
        from threema.gateway import Connection as ThreemaConnection
        threema = ThreemaConnection(
            identity=THREEMA_ID,
            secret=THREEMA_SECRET,
            key=THREEMA_PRIVATE_KEY or None,
        )
        bot.threema_gateway = threema
        log.info(f"🔐 Threema Gateway conectado: {THREEMA_ID}")
    except ImportError:
        log.warning("threema.gateway no instalado. Threema deshabilitado.")
        log.warning("Instalar: pip install threema.gateway")
    except Exception as e:
        log.error(f"Threema Gateway error: {e}")

# ═══════════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════════

app = FastAPI(
    title="Catalyst Threema Bot",
    description=f"BELL {BELL} | Pentetraktys 4D | OSHIRO ERC-26+ | DeepSeek API",
    version=VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════
# MODELOS Pydantic
# ═══════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    message: str = Field(..., description="Mensaje del usuario")
    conv_id: Optional[str] = Field(None, description="ID de conversación")
    mode: str = Field("catalyst", description="Modo: catalyst|pentetraktys|boo|zettelkasten|cobol")
    depth: str = Field("medium", description="Profundidad: surface|medium|deep|frontier")
    thinking: str = Field("off", description="Razonamiento: off|high|max")
    research: bool = Field(False, description="Modo investigación profunda")
    dialectic: bool = Field(False, description="Dialéctica Tesis→Antítesis→Síntesis")
    threema_id: Optional[str] = Field(None, description="ID Threema del usuario")

class ChatResponse(BaseModel):
    content: str
    thinking: Optional[str] = None
    hybrys: Optional[dict] = None
    mode: str
    conv_id: Optional[str] = None
    tokens_used: int = 0
    elapsed_ms: float = 0
    dialectic: Optional[dict] = None

class ThreemaWebhook(BaseModel):
    """Payload del webhook de Threema Gateway."""
    from_id: Optional[str] = Field(None, alias="from")
    to_id: Optional[str] = Field(None, alias="to")
    message_id: Optional[str] = Field(None, alias="messageId")
    date: Optional[str] = None
    text: Optional[str] = None
    nonce: Optional[str] = None
    mac: Optional[str] = None

class ThreemaSendRequest(BaseModel):
    to: str = Field(..., description="Threema ID destino")
    text: str = Field(..., description="Texto a enviar")
    e2e: bool = Field(True, description="Usar cifrado end-to-end")

# ═══════════════════════════════════════════════════════════════
# ENDPOINTS REST
# ═══════════════════════════════════════════════════════════════

@app.get("/", response_class=HTMLResponse)
async def root():
    """Pantalla principal: Launcher con sugerencias Obsidian + acceso directo a chats."""
    launcher_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "launcher.html")
    try:
        with open(launcher_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        messenger_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "messenger.html")
        try:
            with open(messenger_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return """<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Catalyst</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:40px auto;background:#0a0a1a;color:#e0e0e0;">
<h1 style="color:#00ff88;">◆ Catalyst Bot API</h1>
<p>BELL 13450.50 | v""" + VERSION + """</p>
<p><a href="/docs" style="color:#00ff88;">Swagger UI</a> | <a href="/messenger" style="color:#00ff88;">Messenger</a> | <a href="/launcher" style="color:#00ff88;">Launcher</a></p>
</body></html>"""


@app.get("/api/health")
async def health():
    """Health check."""
    return {"status": "ok", "version": VERSION, "bell": BELL, "timestamp": datetime.now().isoformat()}


@app.get("/launcher", response_class=HTMLResponse)
async def launcher():
    """Pantalla principal con sugerencias Obsidian + grafo filológico."""
    launcher_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "launcher.html")
    try:
        with open(launcher_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(404, "launcher.html no encontrado")


@app.get("/suggestions")
async def get_suggestions(limit: int = 10):
    """Endpoint de sugerencias filológicas."""
    try:
        from suggestion_engine import SuggestionEngine
        engine = SuggestionEngine()
        suggestions = engine.generate_suggestions(limit)
        links = engine.graph_links()
        return {
            "suggestions": [
                {
                    "title": s.title, "reason": s.reason,
                    "philological_score": s.philological_score,
                    "metrics": s.metrics,
                    "suggested_mode": s.suggested_mode,
                    "suggested_depth": s.suggested_depth,
                    "concepts": s.concepts, "urgency": s.urgency,
                    "conv_id": s.conv_id, "last_active": s.last_active,
                }
                for s in suggestions
            ],
            "graph_links": links,
            "total_suggestions": len(suggestions),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"suggestions": [], "graph_links": [], "total_suggestions": 0, "error": str(e)}


@app.get("/messenger", response_class=HTMLResponse)
async def messenger():
    """Catalyst Messenger — interfaz chat estilo Threema."""
    messenger_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "messenger.html")
    try:
        with open(messenger_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(404, "messenger.html no encontrado")


@app.get("/api/status")
async def status():
    """Estado completo del bot."""
    return bot.status()


@app.get("/api/convs")
async def list_convs(threema_id: Optional[str] = Query(None)):
    """Listar conversaciones."""
    return {"conversations": bot.list_convs(threema_id)}


@app.delete("/api/convs/{conv_id}")
async def delete_conv(conv_id: str):
    """Borrar una conversación."""
    bot.clear_conv(conv_id)
    return {"deleted": conv_id}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Chat REST — misma interfaz que Catalyst Chat.

    Modos: catalyst, pentetraktys, boo, zettelkasten, cobol
    Profundidad: surface, medium, deep, frontier
    Razonamiento: off, high, max
    """
    # Validar modo
    try:
        mode = Mode(req.mode)
    except ValueError:
        raise HTTPException(400, f"Modo inválido: {req.mode}. Usa: {[m.value for m in Mode]}")

    try:
        depth = Depth(req.depth)
    except ValueError:
        raise HTTPException(400, f"Profundidad inválida: {req.depth}. Usa: {[d.value for d in Depth]}")

    try:
        thinking = Thinking(req.thinking)
    except ValueError:
        raise HTTPException(400, f"Razonamiento inválido: {req.thinking}. Usa: {[t.value for t in Thinking]}")

    # API key opcional
    if API_KEY and req.headers.get("X-API-Key") != API_KEY:
        raise HTTPException(401, "API key requerida")

    response = await bot.chat(
        message=req.message,
        conv_id=req.conv_id,
        mode=mode,
        depth=depth,
        thinking=thinking,
        research=req.research,
        dialectic=req.dialectic,
        threema_id=req.threema_id,
    )

    # ─── Log al Orchestrator ──────────────────────────────────
    if orchestrator:
        try:
            await orchestrator.process_message(
                text=req.message,
                channel="catalyst-bot-api",
                mode=req.mode,
                depth=req.depth,
            )
            # Log de respuesta
            orchestrator.log_message(
                channel="catalyst-bot-api",
                direction="outgoing",
                text=response.content[:1000],
                token_count=response.tokens_used,
                coherence=orchestrator.token_manager.semantic_coherence(response.content),
                mode=req.mode,
                depth=req.depth,
                hybrys=response.hybrys.get("hybrys", 0) if response.hybrys else None,
            )
        except Exception as e:
            log.debug(f"Orchestrator log skipped: {e}")

    return ChatResponse(
        content=response.content,
        thinking=response.thinking,
        hybrys=response.hybrys,
        mode=response.mode,
        conv_id=req.conv_id,
        tokens_used=response.tokens_used,
        elapsed_ms=response.elapsed_ms,
        dialectic=response.dialectic_stages,
    )


@app.get("/api/chat/stream")
async def chat_stream(
    message: str = Query(..., description="Mensaje"),
    conv_id: Optional[str] = Query(None),
    mode: str = Query("catalyst"),
    depth: str = Query("medium"),
    thinking: str = Query("off"),
    research: bool = Query(False),
    dialectic: bool = Query(False),
):
    """Chat con Server-Sent Events streaming."""
    try:
        m = Mode(mode)
        d = Depth(depth)
        t = Thinking(thinking)
    except ValueError as e:
        raise HTTPException(400, str(e))

    async def generate():
        async for token in bot.chat_stream(
            message=message, conv_id=conv_id, mode=m, depth=d,
            thinking=t, research=research, dialectic=dialectic,
        ):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ═══════════════════════════════════════════════════════════════
# THREEMA WEBHOOK
# ═══════════════════════════════════════════════════════════════

@app.post("/api/threema/webhook")
async def threema_webhook(request: Request):
    """
    Webhook de Threema Gateway.
    Recibe mensajes entrantes y responde via Threema API.

    El webhook espera un JSON con:
    {from, to, messageId, date, text, nonce, mac}

    Los comandos especiales que el usuario puede enviar:
      /mode catalyst|pentetraktys|boo|zettelkasten|cobol
      /depth surface|medium|deep|frontier
      /think off|high|max
      /research on|off
      /dialectic on|off
      /new   — nueva conversación
      /list  — listar conversaciones
      /status — estado del bot
    """
    try:
        body = await request.json()
    except:
        raise HTTPException(400, "JSON inválido")

    from_id = body.get("from")
    text = body.get("text", "").strip()
    message_id = body.get("messageId", "")

    if not from_id or not text:
        raise HTTPException(400, "Faltan from o text")

    log.info(f"📩 Threema [{from_id}]: {text[:100]}")

    # ─── Parsear comandos ──────────────────────────────────
    conv_id = f"threema-{from_id}"

    if text.startswith("/"):
        return await _handle_threema_command(from_id, text, conv_id)

    # ─── Procesar mensaje normal ───────────────────────────
    conv = bot.get_or_create_conv(conv_id, from_id)
    mode = conv.mode
    depth = conv.depth
    thinking = conv.thinking

    # Detectar flags inline
    research = "🔬" in text or "#investigacion" in text.lower()
    dialectic = "⚔" in text or "#dialectica" in text.lower()
    clean_text = text.replace("🔬", "").replace("⚔", "").strip()

    if not clean_text:
        clean_text = text

    # ─── Llamar al bot ────────────────────────────────────
    response = await bot.chat(
        message=clean_text,
        conv_id=conv_id,
        mode=mode,
        depth=depth,
        thinking=thinking,
        research=research,
        dialectic=dialectic,
        threema_id=from_id,
    )

    # ─── Formatear respuesta para Threema ──────────────────
    reply = _format_threema_response(response)

    # ─── Enviar respuesta via Threema Gateway ──────────────
    if threema and THREEMA_SECRET:
        try:
            sent = threema.send_e2e(
                to=from_id,
                text=reply[:4000],  # Threema limita a ~4000 chars
                secret=THREEMA_SECRET,
                private_key=THREEMA_PRIVATE_KEY or None,
            )
            log.info(f"✅ Respuesta enviada a {from_id}: {len(reply)} chars")
            return {"status": "sent", "message_id": sent.get("messageId", "") if isinstance(sent, dict) else "ok"}
        except Exception as e:
            log.error(f"Threema send error: {e}")
            # Fallback: devolver respuesta en el webhook response
            return {"status": "error", "reply": reply[:500], "error": str(e)[:200]}

    # Sin Threema configurado: devolver en la respuesta
    return {
        "status": "ok",
        "reply": reply[:4000],
        "mode": mode.value,
        "hybrys": response.hybrys,
        "threema_configured": False,
    }


async def _handle_threema_command(from_id: str, text: str, conv_id: str) -> JSONResponse:
    """Maneja comandos especiales del bot."""
    cmd = text.lower().split()[0]
    args = text.split()[1:] if len(text.split()) > 1 else []

    if cmd == "/mode" and args:
        try:
            m = Mode(args[0])
            bot.set_mode(conv_id, m)
            return JSONResponse({"status": "ok", "reply": f"Modo: {MODES[args[0]]['icon']} {MODES[args[0]]['label']}"})
        except ValueError:
            return JSONResponse({"status": "error", "reply": f"Modos: {[m.value for m in Mode]}"})

    elif cmd == "/depth" and args:
        try:
            d = Depth(args[0])
            bot.set_depth(conv_id, d)
            return JSONResponse({"status": "ok", "reply": f"Profundidad: {DEPTHS[args[0]]['label']} ({DEPTHS[args[0]]['max_tokens']} tokens)"})
        except ValueError:
            return JSONResponse({"status": "error", "reply": f"Profundidades: {[d.value for d in Depth]}"})

    elif cmd == "/think" and args:
        try:
            t = Thinking(args[0])
            bot.set_thinking(conv_id, t)
            labels = {"off": "Rápido", "high": "Pensar", "max": "Profundo"}
            return JSONResponse({"status": "ok", "reply": f"Razonamiento: {labels.get(args[0], args[0])}"})
        except ValueError:
            return JSONResponse({"status": "error", "reply": f"Razonamiento: {[t.value for t in Thinking]}"})

    elif cmd == "/research":
        return JSONResponse({"status": "ok", "reply": "Investigación: usa 🔬 o #investigacion en tu mensaje para activarla."})

    elif cmd == "/dialectic":
        return JSONResponse({"status": "ok", "reply": "Dialéctica: usa ⚔ o #dialectica en tu mensaje para activar Tesis→Antítesis→Síntesis."})

    elif cmd == "/new":
        bot.clear_conv(conv_id)
        return JSONResponse({"status": "ok", "reply": "◆ Nueva conversación iniciada."})

    elif cmd == "/list":
        convs = bot.list_convs(from_id)
        lines = ["📋 Tus conversaciones:"]
        for c in convs[:10]:
            icon = MODES.get(c["mode"], {}).get("icon", "?")
            lines.append(f"  {icon} {c['id'][:8]}… | {c['mode']} | {c['depth']} | {c.get('title', 'Sin título')[:30]}")
        return JSONResponse({"status": "ok", "reply": "\n".join(lines)})

    elif cmd == "/status":
        s = bot.status()
        return JSONResponse({"status": "ok", "reply": f"◆ Catalyst Bot v{s['version']}\nBELL {s['bell']}\nThreema: {'✅' if s['threema_connected'] else '❌'}\nChats: {s['total_conversations']}\nMsgs: {s['total_messages']}"})

    elif cmd == "/help":
        return JSONResponse({"status": "ok", "reply": """◆ Catalyst Bot — Comandos:
/mode catalyst|pentetraktys|boo|zettelkasten|cobol
/depth surface|medium|deep|frontier
/think off|high|max
/research — info
/dialectic — info
/new — nuevo chat
/list — mis chats
/status — estado
🔬 en mensaje = investigación
⚔ en mensaje = dialéctica"""})

    else:
        return JSONResponse({"status": "error", "reply": f"Comando desconocido: {cmd}. Usa /help"})


def _format_threema_response(response: BotResponse) -> str:
    """Formatea una respuesta para Threema (texto plano con formato mínimo)."""
    parts = []

    # Icono del modo
    icon = MODES.get(response.mode, {}).get("icon", "◆")

    # Contenido principal
    parts.append(f"{icon} {response.content}")

    # Dialéctica
    if response.dialectic_stages:
        ds = response.dialectic_stages
        if ds.get("antithesis"):
            parts.append("\n─── ⚔ ANTÍTESIS ───")
            parts.append(ds["antithesis"])
        if ds.get("synthesis"):
            parts.append("\n─── ◆ SÍNTESIS ───")
            parts.append(ds["synthesis"])

    # Hybrys
    if response.hybrys:
        h = response.hybrys
        level_icon = "⚠" if h["nivel"] == "warning" else "🚨" if h["nivel"] == "critical" else "✓"
        parts.append(f"\n\nΔ Hybrys {level_icon} {h['hybrys']:.0%} | C:{h['confianza']:.0%} V:{h['validacion']:.0%}")

    # Razonamiento
    if response.thinking:
        parts.append(f"\n\n💭 Razonamiento:\n{response.thinking[:1000]}")

    return "\n".join(parts)


@app.post("/api/threema/send")
async def threema_send(req: ThreemaSendRequest):
    """Envía un mensaje directo via Threema Gateway."""
    if not threema:
        raise HTTPException(503, "Threema Gateway no configurado")

    try:
        if req.e2e:
            result = threema.send_e2e(
                to=req.to,
                text=req.text[:4000],
                secret=THREEMA_SECRET,
                private_key=THREEMA_PRIVATE_KEY or None,
            )
        else:
            result = threema.send_simple(
                to=req.to,
                text=req.text[:4000],
                secret=THREEMA_SECRET,
            )
        return {"status": "sent", "result": str(result)}
    except Exception as e:
        raise HTTPException(500, f"Threema send error: {e}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    threema_status = "Configurado" if threema else "Sin configurar"
    log.info(f"Server starting on http://{host}:{port} | BELL {BELL} v{VERSION} | Threema: {threema_status}")
    uvicorn.run(app, host=host, port=port, log_level="info", use_colors=False)
