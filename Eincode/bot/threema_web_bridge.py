"""
═══════════════════════════════════════════════════════════════════════════
CATALYST THREEMA WEB BRIDGE
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

Conecta Catalyst Bot DIRECTAMENTE a Threema Web (sin Gateway).
Usa el App Remote Protocol indirectamente: Threema Web ↔ Teléfono vía ARP.
El bot monitorea Threema Web y responde automáticamente.

FUNCIONAMIENTO:
  1. Abre Threema Web en navegador (Chromium/Playwright)
  2. Usuario escanea QR una vez con su teléfono
  3. Bot monitorea mensajes entrantes
  4. Procesa con Catalyst Engine (DeepSeek)
  5. Escribe respuesta en Threema Web
  6. Threema Web la envía al teléfono → teléfono la transmite E2E

VENTAJAS:
  ✅ Sin Gateway — usa Threema Web normal
  ✅ Gratis — no requiere suscripción
  ✅ E2E — cifrado mantenido (el teléfono es el relay)
  ✅ Directo — mensajes van de/a tu propio número Threema
  ✅ Multi-modo — Catalyst, Pentetraktys, Boo, Zettelkasten, COBOL

REQUISITOS:
  - Teléfono con Threema instalado y conectado a internet
  - Python 3.10+ + Playwright
  - DeepSeek API key

USO:
  python threema_web_bridge.py
  # Escanea el QR con tu teléfono Threema
  # El bot empieza a responder automáticamente
═══════════════════════════════════════════════════════════════════════════
"""

import asyncio, os, sys, io, json, time, re, hashlib, logging
from pathlib import Path
from typing import Optional, Dict, Set
from datetime import datetime

# Fix Windows encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ─── Dependencias ────────────────────────────────────────────
try:
    from playwright.async_api import async_playwright, Page, Browser
except ImportError:
    print("ERROR: playwright no instalado.")
    print("  pip install playwright")
    print("  playwright install chromium")
    sys.exit(1)

# ─── Catalyst Bot Engine ────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from catalyst_bot import CatalystBot, Mode, Depth, Thinking, MODES

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger("threema-bridge")

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════
THREEMA_WEB_URL = "https://web.threema.ch"
SESSION_FILE = Path(__file__).parent / "threema_session.json"
POLL_INTERVAL = 2.0  # segundos entre chequeos de mensajes
MAX_RESPONSE_CHARS = 3500  # Threema Web limita a ~4000 chars

# ═══════════════════════════════════════════════════════════════
# THREEMA WEB BRIDGE
# ═══════════════════════════════════════════════════════════════

class ThreemaWebBridge:
    """
    Puente entre Catalyst Bot y Threema Web.
    Automatiza Threema Web para leer y enviar mensajes.
    """

    def __init__(self):
        self.bot = CatalystBot()
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.context = None
        self.own_id: Optional[str] = None
        self.processed_messages: Set[str] = set()  # IDs de mensajes ya procesados
        self.active_chats: Dict[str, str] = {}  # chat_name -> last_message_id
        self.running = False

        # Config por chat (modo, profundidad, etc.)
        self.chat_config: Dict[str, Dict] = {}  # chat_id -> {mode, depth, thinking}

        log.info("◆ Threema Web Bridge inicializado")

    async def start(self):
        """Inicia el navegador y conecta a Threema Web."""
        log.info("Iniciando navegador...")

        pw = await async_playwright().start()

        # Intentar cargar sesión guardada
        if SESSION_FILE.exists():
            log.info("Cargando sesión guardada...")
            self.context = await pw.chromium.launch_persistent_context(
                user_data_dir=str(SESSION_FILE.parent / "threema_profile"),
                headless=False,
                viewport={"width": 1280, "height": 900},
            )
        else:
            self.browser = await pw.chromium.launch(
                headless=False,
                args=["--no-sandbox"],
            )
            self.context = await self.browser.new_context(
                viewport={"width": 1280, "height": 900},
            )

        self.page = await self.context.new_page()

        # Navegar a Threema Web
        log.info(f"Conectando a {THREEMA_WEB_URL}...")
        await self.page.goto(THREEMA_WEB_URL, wait_until="networkidle", timeout=30000)

        # Verificar si ya está autenticado
        await asyncio.sleep(3)
        qr_present = await self._is_qr_code_present()

        if qr_present:
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            log.info("📱 ESCANEA EL CÓDIGO QR con tu teléfono Threema")
            log.info("   Abre Threema → Ajustes → Threema Web → Escanear QR")
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

            # Esperar a que el QR desaparezca (sesión iniciada)
            for i in range(120):  # 2 minutos máximo
                await asyncio.sleep(1)
                if not await self._is_qr_code_present():
                    log.info("✅ Sesión iniciada correctamente")
                    break
                if i % 10 == 9:
                    log.info("   Esperando escaneo QR...")
            else:
                log.error("Timeout esperando QR. Reintenta.")
                return

            # Guardar sesión para futuro
            await self.context.storage_state(path=str(SESSION_FILE))
            log.info(f"Sesión guardada en {SESSION_FILE}")
        else:
            log.info("✅ Sesión ya activa")

        # Esperar a que cargue la interfaz
        await asyncio.sleep(3)

        # Detectar propio ID
        try:
            self.own_id = await self._get_own_id()
            log.info(f"Threema ID: {self.own_id}")
        except:
            log.warning("No se pudo detectar el ID propio")

        self.running = True
        log.info("◆ Puente Threema Web ACTIVO — monitoreando mensajes")

    async def _is_qr_code_present(self) -> bool:
        """Detecta si el QR de login está visible."""
        try:
            # El QR se renderiza en un canvas o div específico
            qr = await self.page.query_selector("canvas.qr-code, .qr-code, [data-qr], #qrcode")
            return qr is not None
        except:
            return False

    async def _get_own_id(self) -> Optional[str]:
        """Intenta obtener el propio Threema ID de la interfaz."""
        try:
            # Buscar en el header o menú de Threema Web
            text = await self.page.inner_text("body")
            # El ID está usualmente en algún elemento con aria-label o en el título
            match = re.search(r"([A-Z0-9]{8})", text)
            return match.group(1) if match else None
        except:
            return None

    async def monitor_loop(self):
        """Loop principal: monitorea mensajes y responde."""
        if not self.running:
            await self.start()

        log.info("Monitor loop iniciado (intervalo: %.1fs)", POLL_INTERVAL)

        while self.running:
            try:
                new_messages = await self._fetch_new_messages()

                for msg in new_messages:
                    if msg["id"] in self.processed_messages:
                        continue

                    self.processed_messages.add(msg["id"])
                    log.info(f"📩 Nuevo mensaje de {msg['sender'][:20]}: {msg['text'][:80]}")

                    # Procesar con Catalyst
                    response = await self._process_message(msg)

                    # Enviar respuesta
                    if response:
                        await self._send_response(msg["chat_id"], response)

            except Exception as e:
                log.error(f"Error en monitor loop: {e}")
                # Intentar reconectar
                await asyncio.sleep(5)

            await asyncio.sleep(POLL_INTERVAL)

    async def _fetch_new_messages(self) -> list:
        """
        Lee mensajes nuevos de Threema Web.
        Estrategia: evalúa JavaScript en la página para extraer mensajes
        del DOM de Threema Web.
        """
        messages = []

        try:
            # Threema Web usa React — los mensajes están en el DOM
            # Buscamos contenedores de mensajes no leídos
            result = await self.page.evaluate("""
                () => {
                    const messages = [];
                    // Threema Web estructura:
                    // Los chats no leídos tienen badge
                    // Los mensajes están en .message-container o similar

                    // Buscar conversaciones con badge de no leídos
                    const unreadBadges = document.querySelectorAll(
                        '.badge.unread, [class*="unread"], .conversation-badge, ' +
                        '[data-unread="true"], .unread-count'
                    );

                    // Si no hay badges, buscar mensajes recientes
                    const messageElements = document.querySelectorAll(
                        '.message-body, .message-text, [class*="message"][class*="body"], ' +
                        '[data-msg-id], .chat-message'
                    );
 00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 
                    messageElements.forEach((el, i) => {
                        const text = el.textContent?.trim() || '';
                        const parent = el.closest('[class*="message"]') || el.parentElement;
                        const msgId = parent?.getAttribute('data-msg-id') ||
                                      parent?.getAttribute('data-message-id') ||
                                      el.getAttribute('data-msg-id') ||
                                      'msg-' + i + '-' + Date.now();

                        // Intentar extraer remitente
                        const senderEl = parent?.querySelector(
                            '.sender, .message-sender, [class*="sender"], .name'
                        );
                        const sender = senderEl?.textContent?.trim() || 'Desconocido';

                        // Chat ID (conversación actual)
                        const chatContainer = el.closest(
                            '[class*="conversation"], [class*="chat"], .messages-container'
                        );
                  0      const chatId = chatContainer?.getAttribute('data-chat-id') ||
                                       chatContainer?.getAttribute('id') ||
                           010 0 0 0 0 0 0 0 0 0 0 0 0w0i0n0d0o0w0.0l0o0c0a0t0i0o0n0.0h0a0s0h0?0.0r0e0p0l0a0c0e0(0'0#0'0,0 0'0'0)0 0|0|0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'0a0c0t0i0v0e0'0;0
0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0m0e0s0s0a0g0e0s0.0p0u0s0h0(0{0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0i0d0:0 0m0s0g0I0d0,0
0 0 0 0 0 0 0                      sender: sender,
               000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 0 0 0 0 0 0 0 0 0 0 0 0 0t0e0x0t0:0 0t0e0x0t0,0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0c0h0a0t0_0i0d0:0 0c0h0a0t0I0d0,0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0c0h0a0t0_0n0a0m0e0:0 0c0h0a0t0I0d0,0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0t0i0m0e0s0t0a0m0p0:0 0D0a0t0e0.0n0o0w0(0)0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0}0)0;0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0}0)0;0
0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0r0e0t0u0r0n0 0m0e0s0s0a0g0e0s0;0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0}0
0 0 0 0 0 0 0 0 0 0 0 0 0"0"0"0)0
0
0 0 0 0 0 0 0 0 0 0 0 0 0i0f0 0r0e0s0u0l0t0 0a0n0d0 0i0s0i0n0s0t0a0n0c0e0(0r0e0s0u0l0t0,0 0l0i0s0t0)0:0
0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0m0e0s0s0a0g0e0s0 0=0 0r0e0s0u0l0t0
0
0 0 0 0 0 0 0 0 0e0x0c0e0p0t0 0E0x0c0e0p0t0i0o0n0 0a0s0 0e0:0
0 0 0 0 0 0 0 0 0 0 0 0 log.debug(f"DOM message fetch error: {e}")

        return messages

    async def _process_message(self, msg: dict) -> Optional[str]:
        """Procesa un mensa0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000j0e0 0c0o0n0 0C0a0t0a0l0y0s0t0 0B0o0t0 0y0 0r0e0t0o0r0n0a0 0l0a0 0r0e0s0p0u0e0s0t0a0.0"0"0"0
0 0 0 0 0 0 0 0 0c0h0a0t0_0i0d0 0=0 0m0s0g0.0g0e0t0(0"0c0h0a0t0_0i0d0"0,0 0"0d0e0f0a0u0l0t0"0)0
0 0 0 0 0 0 0 0 0t0e0x0t0 0=0 0m0s0g0.0g0e0t0(0"0t0e0x0t0"0,0 0"0"0)0.0s0t0r0i0p0(0)0
0
0 0 0 0 0 0 0 0 0i0f0 0n0o0t0 0t0e0x0t0:0
0 0 0 0 0 0 0 0 0 0 00211111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111102.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.2.0  return None

        # Obtener o crear configuración del chat
        if chat_id not in self.chat_config:
            self.chat_config[chat_id] = {"mode": Mode.CATALYST, "depth": Depth.MEDIUM, "thinking": Thinking.OFF}

        cfg = self.chat_config[chat_id]

        # Comandos especiales
        if text.startswith("/"):
            return await self._handle_command(chat_id, text)

        # Flags inline
        research = "🔬" in text or "#investigacion" in text.lower()
        dialectic = "⚔" in text or "#dialectica" in text.lower()
        clean = text.replace("🔬", "").replace("⚔", "").strip() or text

0 0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 0 0 0 0 0 0 0#0 0L0l0a0m0a0r0 0a0l0 0b0o0t0
0 0 0 0 0 0 0 0 0c0o0n0v0_0i0d0 0=0 0f0"0t0h0r0e0e0m0a0-0w0e0b0-0{0c0h0a0t0_0i0d0}0"0
0 0 0 0 0 0 0 0 0r0e0s0p0o0n0s0e0 0=0 0a0w0a0i0t0 0s0e0l0f0.0b0o0t0.0c0h0a0t0(0
0 0 0 0 0 0 0 0 0 0 0 0 0m0e0s0s0a0g0e0=0c0l0e0a0n0,0
0 0 0 0 0 0 0 0 0 0 0 0 0c0o0n0v0_0i0d0=0c0o0n0v0_0i0d0,0
0 0 0 0 0 0 0 0 0 0 0 0 0m0o0d0e0=0c0f0g0[0"0m0o0d0e0"0]0,0
0 0 0 0 0 0 0 0 0 0 0 0 0d0e0p0t0h0=0c0f0g0[0"0d0e0p0t0h0"0]0,0
0 0 0 0 0 0 0 0 0 0 0 0 0t0h0i0n0k0i0n0g0=0c0f0g0[0"0t0h0i0n0k0i0n0g0"0]0,0
0 0 0 0 0 0 0 0 0 0 0 0 0r0e0s0e0a0r0c0h0=0r0e0s0e0a0r0c0h0,0
0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
+











































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































            dialectic=dialectic,
        )

        # Formatear respuesta
        return self._format_response(response)

    async def _handle_command(self, chat_id: str, text: str) -> Optional[str]:
        """Maneja comandos / del usuario."""
        parts = text.lower().split()
        cmd = parts[0]
        args = parts[1:]

        if cmd == "/mode" and args:
            try:
                m = Mode(args[0])
                self.chat_config[chat_id]["mode"] = m
                return f"Modo: {MODES[args[0]]['icon']} {MODES[args[0]]['label']}"
            except ValueError:
                return f"Modos: {[m.value for m in Mode]}"

        elif cmd == "/depth" and args:
            try:
                d = Depth(args[0])
                self.chat_config[chat_id]["depth"] = d
                return f"Profundidad: {d.value}"
            except ValueError:
                return f"Profundidades: {[d.value for d in Depth]}"

        elif cmd == "/think" and args:
            try:
                t = Thinking(args[0])
                self.chat_config[chat_id]["thinking"] = t
                labels = {"off": "Rápido", "high": "Pensar", "max": "Profundo"}
                return f"Razonamiento: {labels.get(args[0], args[0])}"
            except ValueError:
                return f"Niveles: {[t.value for t in Thinking]}"

        elif cmd == "/new":
            self.bot.clear_conv(f"threema-web-{chat_id}")
            return "◆ Nueva conversación"

        elif cmd == "/status":
            s = self.bot.status()
            return f"◆ Catalyst v{s['version']}\nChats: {s['total_conversations']}\nMsgs: {s['total_messages']}"

        elif cmd == "/help":
            return """◆ Catalyst Threema Bot
/mode catalyst|pentetraktys|boo|zettelkasten|cobol
/depth surface|medium|deep|frontier
/think off|high|max
/new — reiniciar chat
/status — estado
🔬 = investigación
⚔ = dialéctica"""

        return None

    def _format_response(self, response) -> str:
        """Formatea respuesta para Threema."""
        icon = MODES.get(response.mode, {}).get("icon", "◆")
        text = f"{icon} {response.content}"

        # Dialéctica
        if response.dialectic_stages:
            ds = response.dialectic_stages
            if ds.get("antithesis"):
                text += f"\n\n─── ⚔ ANTÍTESIS ───\n{ds['antithesis']}"
            if ds.get("synthesis"):
                text += f"\n\n─── ◆ SÍNTESIS ───\n{ds['synthesis']}"

        # Hybrys
        if response.hybrys:
            h = response.hybrys
            level = "⚠" if h["nivel"] == "warning" else "🚨" if h["nivel"] == "critical" else "✓"
            text += f"\n\nΔ Hybrys {level} {h['hybrys']:.0%}"

        return text[:MAX_RESPONSE_CHARS]

    async def _send_response(self, chat_id: str, text: str):
        """Escribe y envía la respuesta en Threema Web."""
        if not text.strip():
            return

        try:
            # Estrategia: usar el teclado virtual de Playwright
            # 1. Hacer clic en el chat correcto (si no está ya activo)
            # 2. Encontrar el campo de texto
            # 3. Escribir el mensaje
            # 4. Presionar Enter

            # Buscar el chat en la lista y hacer clic
            chat_selector = f'[data-chat-id="{chat_id}"], .conversation[data-id="{chat_id}"]'
            chat_el = await self.page.query_selector(chat_selector)
            if chat_el:
                await chat_el.click()
                await asyncio.sleep(0.5)

            # Buscar el input de mensaje
            input_selectors = [
                'textarea[placeholder*="Mensaje"]',
                'textarea[placeholder*="Message"]',
                '[contenteditable="true"]',
                '.message-input',
                '#message-input',
                'textarea',
                '[role="textbox"]',
            ]

            input_el = None
            for sel in input_selectors:
                input_el = await self.page.query_selector(sel)
                if input_el:
                    break

            if not input_el:
                log.warning("No se encontró el campo de entrada")
                return

            # Escribir
            await input_el.click()
            await asyncio.sleep(0.2)
            await input_el.fill("")  # limpiar
            await input_el.type(text, delay=30)  # escribir carácter por carácter

            # Enviar
            await self.page.keyboard.press("Enter")
            log.info(f"✅ Respuesta enviada ({len(text)} chars)")

        except Exception as e:
            log.error(f"Error enviando respuesta: {e}")

    async def stop(self):
        """Detiene el bridge."""
        self.running = False
        if self.browser:
            await self.browser.close()
        log.info("Bridge detenido")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

async def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║  ◆ CATALYST THREEMA WEB BRIDGE                             ║
║  Conexión DIRECTA a Threema (sin Gateway)                   ║
║  BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+          ║
╚══════════════════════════════════════════════════════════════╝
""")

    bridge = ThreemaWebBridge()

    try:
        await bridge.start()
        await bridge.monitor_loop()
    except KeyboardInterrupt:
        print("\n\nDeteniendo bridge...")
    finally:
        await bridge.stop()


if __name__ == "__main__":
    # Verificar Playwright
    try:
        import playwright
    except ImportError:
        print("ERROR: playwright no instalado.")
        print("\nInstalar con:")
        print("  pip install playwright")
        print("  playwright install chromium")
        sys.exit(1)

    asyncio.run(main())
