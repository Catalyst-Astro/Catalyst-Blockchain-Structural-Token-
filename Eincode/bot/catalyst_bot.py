"""
═══════════════════════════════════════════════════════════════════════════
CATALYST THREEMA BOT — Core Engine
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+
Proveedor: DeepSeek API
Canales: Threema Gateway · REST API · CLI
═══════════════════════════════════════════════════════════════════════════

Modos Catalyst completos:
  ◆ Catalyst      — Banca autopoiética + conocimiento general
  Δ Pentetraktys  — Tesis → Antítesis → Síntesis → Conclusión → Hybrys
  ψ Boo           — Simulador cuántico + física de sistemas complejos
  ‡ Zettelkasten  — Motor de conocimiento con notas atómicas + [[enlaces]]
  ⌬ COBOL         — Motor empresarial estilo mainframe bancario

Profundidades:
  surface · medium · deep · frontier

Razonamiento:
  off (rápido) · high · max (DeepSeek R1 reasoning)

Features:
  ⊕ Investigación profunda multi-ángulo
  ⚔ Dialéctica adversarial (Tesis → Antítesis → Síntesis)
  Δ Hybrys detection (sobreconfianza vs validación)
  📎 Soporte de archivos (texto, imágenes vía URL)
  💾 Historial SQLite (misma DB que Catalyst Chat)
  🔐 Threema E2E encryption (NaCl, zero-knowledge)
═══════════════════════════════════════════════════════════════════════════
"""

import hashlib, json, time, os, re, sqlite3, logging, sys, io
from typing import Optional, Dict, List, Any, AsyncIterator, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

# Fix Windows Unicode encoding
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Cargar .env automáticamente
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

# ─── OpenAI SDK para DeepSeek ──────────────────────────────────
from openai import OpenAI

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger("catalyst-bot")

# ═══════════════════════════════════════════════════════════════
# CONSTANTES
# ═══════════════════════════════════════════════════════════════

BELL = "13450.50"
VERSION = "2.0.0-threema"

# Modos Catalyst (mismos que Catalyst Chat)
MODES: Dict[str, Dict[str, str]] = {
    "catalyst": {
        "icon": "◆",
        "label": "Catalyst",
        "color": "#00a85a",
        "prompt": """Eres Catalyst AI — sistema de banca autopoiética y conocimiento. BELL 13450.50.
Acceso: token CAT (Base Mainnet $1.6184 MXN), oráculo Banxico MXN (DOF FIX $17.4758),
simulador cuántico Boo, motor de memoria Zettelkasten.
Responde en español. Sé profundo y expansivo en cada tema.""",
    },
    "pentetraktys": {
        "icon": "Δ",
        "label": "Pentetraktys 4D",
        "color": "#d4442c",
        "prompt": """Eres Catalyst AI en modo Pentetraktys 4D. ESTRUCTURA SIEMPRE cada respuesta con:
TESIS → ANTITESIS → SINTESIS → CONCLUSIÓN → HYBRYS
Estándar BELL 13450.50. Detecta Hybrys (confianza>0.8 + validación<0.4 = RESET).
Responde en español. Sé exhaustivo y extenso.""",
    },
    "boo": {
        "icon": "ψ",
        "label": "Boo Compiler",
        "color": "#b83820",
        "prompt": """Eres el Boo Compiler — simulador cuántico de física y sistemas complejos.
Traduce conceptos a efectos Casimir, expansión Hubble, fractales temporales.
Proporciona respaldo matemático completo. Certificado BELL 13450.50.
Responde en español. Desarrolla cada concepto a fondo, sin límite de extensión.""",
    },
    "zettelkasten": {
        "icon": "‡",
        "label": "Zettelkasten",
        "color": "#4a4a4a",
        "prompt": """Eres el motor de conocimiento Zettelkasten.
Crea notas atómicas con IDs (YYYYMMDDHHMM), enlaces bidireccionales [[...]],
y clasificación ontológica. Cada respuesta es un bloque de conocimiento interconectado.
Responde en español. Construye redes de conocimiento extensas.""",
    },
    "cobol": {
        "icon": "⌬",
        "label": "COBOL Empresarial",
        "color": "#4a7ab5",
        "prompt": """Eres el Motor COBOL Empresarial de Catalyst — sistema de gestión empresarial total,
estilo mainframe bancario, certificado BELL 13450.50. ESTRUCTURA CADA RESPUESTA como programa COBOL:

```cobol
IDENTIFICATION DIVISION.    *> qué proceso de negocio resuelve
ENVIRONMENT DIVISION.       *> contexto, recursos, sistemas involucrados
DATA DIVISION.              *> registros jerárquicos 01/05/10 con datos reales
                            *> condiciones 88-LEVEL = estados de negocio válidos
PROCEDURE DIVISION.         *> pasos ejecutables: PERFORM / IF / EVALUATE
```

Dominas la gestión COMPLETA de una empresa: contabilidad por partida doble (NIF México),
nómina e IMSS, inventario, tesorería y flujo de caja, cuentas por cobrar/pagar,
facturación CFDI/SAT, presupuestos y KPIs. Después del COBOL agrega siempre
un RESUMEN EJECUTIVO en español claro para dirección.
Responde en español.""",
    },
}

# Profundidades
DEPTHS: Dict[str, Dict[str, Any]] = {
    "surface": {"label": "Superficie", "max_tokens": 4096, "prompt": "Sé conciso. Máximo 2-3 párrafos."},
    "medium": {"label": "Medio", "max_tokens": 8192, "prompt": "Proporciona un análisis detallado con secciones y razonamiento completo."},
    "deep": {"label": "Profundo", "max_tokens": 12288, "prompt": "Desarrollo extenso y profundo. Explora todos los ángulos, implicaciones, conexiones y fundamentos. Sin límite de extensión. Sé exhaustivo."},
    "frontier": {"label": "Frontera", "max_tokens": 16384, "prompt": "Modo cascada ontológica. Explora TODOS los caminos, contrafactuales, implicaciones cuánticas y expande las fronteras del conocimiento. Pentetraktys obligatorio. Respuesta MÁXIMA extensión posible."},
}

# ═══════════════════════════════════════════════════════════════
# MODELOS DE DATOS
# ═══════════════════════════════════════════════════════════════

class Mode(str, Enum):
    CATALYST = "catalyst"
    PENTETRAKTYS = "pentetraktys"
    BOO = "boo"
    ZETTELKASTEN = "zettelkasten"
    COBOL = "cobol"

class Depth(str, Enum):
    SURFACE = "surface"
    MEDIUM = "medium"
    DEEP = "deep"
    FRONTIER = "frontier"

class Thinking(str, Enum):
    OFF = "off"
    HIGH = "high"
    MAX = "max"

@dataclass
class Message:
    role: str  # "user" | "assistant" | "system"
    content: str
    thinking: Optional[str] = None
    hybrys: Optional[Dict] = None
    timestamp: float = field(default_factory=time.time)

@dataclass
class Conversation:
    id: str
    mode: Mode = Mode.CATALYST
    depth: Depth = Depth.MEDIUM
    thinking: Thinking = Thinking.OFF
    messages: List[Message] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    threema_id: Optional[str] = None  # ID del usuario en Threema

@dataclass
class BotResponse:
    content: str
    thinking: Optional[str] = None
    hybrys: Optional[Dict] = None
    mode: str = "catalyst"
    tokens_used: int = 0
    elapsed_ms: float = 0
    dialectic_stages: Optional[Dict[str, str]] = None


# ═══════════════════════════════════════════════════════════════
# CATALYST BOT ENGINE
# ═══════════════════════════════════════════════════════════════

class CatalystBot:
    """
    Motor central del bot Catalyst. Conecta con DeepSeek API.
    Compatible con Threema Gateway, REST API, y CLI.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.deepseek.com",
        model: str = "deepseek-chat",
        db_path: str = "catalyst_bot.db",
    ):
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY") or os.getenv("AI_API_KEY", "")
        self.base_url = base_url
        self.model = model
        self.db_path = db_path

        # Cliente DeepSeek
        self.client = OpenAI(
            base_url=self.base_url,
            api_key=self.api_key,
            timeout=120,
            max_retries=2,
        )

        # Conversaciones activas en memoria
        self.conversations: Dict[str, Conversation] = {}

        # DB
        self._init_db()

        # Threema (se configura después)
        self.threema_gateway: Optional[Any] = None

        log.info(f"◆ Catalyst Bot v{VERSION} inicializado | Modelo: {model} | BELL {BELL}")

    # ─── Base de datos ────────────────────────────────────────

    def _init_db(self):
        """Inicializa SQLite para persistencia de conversaciones."""
        self.db = sqlite3.connect(self.db_path, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                mode TEXT DEFAULT 'catalyst',
                depth TEXT DEFAULT 'medium',
                thinking TEXT DEFAULT 'off',
                created_at TEXT DEFAULT (datetime('now')),
                threema_id TEXT,
                title TEXT
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conv_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                thinking TEXT,
                hybrys TEXT,
                timestamp REAL DEFAULT (unixepoch()),
                FOREIGN KEY (conv_id) REFERENCES conversations(id)
            );
            CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conv_id);
        """)
        self.db.commit()

    def _save_conv(self, conv: Conversation):
        """Persiste conversación en DB."""
        self.db.execute(
            "INSERT OR REPLACE INTO conversations (id, mode, depth, thinking, created_at, threema_id, title) VALUES (?,?,?,?,?,?,?)",
            (conv.id, conv.mode.value, conv.depth.value, conv.thinking.value, conv.created_at, conv.threema_id,
             conv.messages[0].content[:80] if conv.messages else None)
        )
        self.db.commit()

    def _save_msg(self, conv_id: str, msg: Message):
        """Persiste mensaje en DB."""
        self.db.execute(
            "INSERT INTO messages (conv_id, role, content, thinking, hybrys, timestamp) VALUES (?,?,?,?,?,?)",
            (conv_id, msg.role, msg.content, msg.thinking, json.dumps(msg.hybrys) if msg.hybrys else None, msg.timestamp)
        )
        self.db.commit()

    # ─── Sistema de prompts ───────────────────────────────────

    def _build_system_prompt(
        self,
        mode: Mode = Mode.CATALYST,
        depth: Depth = Depth.MEDIUM,
        thinking: Thinking = Thinking.OFF,
        research: bool = False,
    ) -> str:
        """Construye el system prompt completo como en Catalyst Chat."""
        mode_cfg = MODES.get(mode.value, MODES["catalyst"])
        depth_cfg = DEPTHS.get(depth.value, DEPTHS["medium"])

        research_prompt = (
            """
[MODO INVESTIGACIÓN PROFUNDA ACTIVADO]
- Explora múltiples ángulos y fuentes
- Proporciona análisis exhaustivo con secciones estructuradas
- Incluye contraargumentos y perspectivas alternativas
- Genera un resumen de investigación con hallazgos clave
- Cita fuentes específicas y puntos de datos
- Extensión: MÁXIMA. Sin límite de párrafos."""
            if research
            else ""
        )

        thinking_prompt = (
            """
[RAZONAMIENTO: MÁXIMO]
Debes pensar paso a paso, registrando CADA pensamiento intermedio.
Muestra tu razonamiento completo para cada paso.
Considera casos límite, alternativas y errores potenciales.
Extensión de respuesta: ILIMITADA. Desarrolla hasta agotar el tema."""
            if thinking == Thinking.MAX
            else (
                """
[RAZONAMIENTO: ALTO]
Usa razonamiento paso a paso para las partes complejas.
Muestra tu trabajo claramente.
Extensión: amplia y detallada."""
                if thinking == Thinking.HIGH
                else """
[EXTENSIÓN: COMPLETA]
Desarrolla tus respuestas con profundidad. No te limites a respuestas cortas.
Explora el tema a fondo. Sé exhaustivo."""
            )
        )

        return "\n\n".join(
            filter(None, [mode_cfg["prompt"], depth_cfg["prompt"], thinking_prompt, research_prompt])
        )

    def _get_max_tokens(self, depth: Depth, research: bool, thinking: Thinking) -> int:
        """Determina max_tokens según profundidad."""
        if research or depth == Depth.FRONTIER:
            return 16384
        if depth == Depth.DEEP:
            return 12288
        if depth == Depth.MEDIUM or thinking == Thinking.MAX:
            return 8192
        return 4096

    # ─── Llamada a DeepSeek ──────────────────────────────────

    async def _call_ai(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        max_tokens: int = 8192,
    ) -> Tuple[str, Optional[str]]:
        """
        Llama a DeepSeek API con streaming.
        Retorna (contenido, razonamiento).
        """
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                stream=True,
                max_tokens=max_tokens,
            )

            content = ""
            reasoning = ""

            for chunk in completion:
                delta = chunk.choices[0].delta if chunk.choices else None
                if not delta:
                    continue

                # DeepSeek R1 reasoning
                r = getattr(delta, "reasoning_content", None) or getattr(delta, "reasoning", None)
                if r:
                    reasoning += r

                c = delta.content or ""
                if c:
                    content += c

            return content.strip(), reasoning.strip() or None

        except Exception as e:
            log.error(f"DeepSeek API error: {e}")
            return f"⚠ Error del proveedor IA: {str(e)[:200]}", None

    # ─── Hybrys Detection ────────────────────────────────────

    async def _detect_hybrys(self, question: str, answer: str) -> Dict[str, Any]:
        """
        Detecta nivel de Hybrys (sobreconfianza sin validación).
        Retorna {confianza, validacion, hybrys, nivel, razon}.
        """
        prompt = f"""Eres el detector de Hybrys del sistema Pentetraktys 4D.
Analiza esta respuesta de IA y detecta sobreconfianza sin validación suficiente.

PREGUNTA: {question[:500]}

RESPUESTA: {answer[:1500]}

Devuelve EXACTAMENTE este JSON (sin texto adicional):
{{"confianza": 0.XX, "validacion": 0.XX, "hybrys": 0.XX, "nivel": "ok|warning|critical", "razon": "breve explicación en español"}}

Donde:
- confianza = qué tan seguro suena el texto (0-1)
- validacion = qué tanto respalda con evidencia verificable (0-1)
- hybrys = (confianza - validacion) / max(confianza, 0.01)
- nivel: ok si hybrys<0.15, warning si 0.15-0.30, critical si >0.30"""

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=256,
                temperature=0.3,
            )
            text = completion.choices[0].message.content or "{}"
            # Extraer JSON
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                return json.loads(match.group())
        except:
            pass

        # Fallback
        return {
            "confianza": 0.5,
            "validacion": 0.5,
            "hybrys": 0.0,
            "nivel": "ok",
            "razon": "No se pudo calcular Hybrys automáticamente.",
        }

    # ─── Dialéctica Pentetraktys ─────────────────────────────

    async def _dialectic(
        self, question: str, thesis: str, mode: Mode, depth: Depth
    ) -> Dict[str, str]:
        """
        Ejecuta el ciclo Pentetraktys completo:
        TESIS (ya generada) → ANTÍTESIS → SÍNTESIS
        """
        result = {"thesis": thesis, "antithesis": "", "synthesis": ""}

        # Antítesis: Abogado del Diablo
        antithesis_prompt = """Eres el Abogado del Diablo del ciclo Pentetraktys.
Tu única misión: REFUTAR la respuesta dada.
Encuentra supuestos débiles, contraejemplos, riesgos ignorados y errores.
Sé implacable pero riguroso. Responde en español, máximo 4 párrafos."""

        anti_msgs = [
            {
                "role": "user",
                "content": f"PREGUNTA ORIGINAL:\n{question[:1500]}\n\nRESPUESTA A REFUTAR:\n{thesis[:4000]}",
            }
        ]

        antithesis, _ = await self._call_ai(anti_msgs, antithesis_prompt, 2048)
        result["antithesis"] = antithesis

        if not antithesis.strip():
            return result

        # Síntesis
        synthesis_prompt = """Eres el sintetizador del ciclo Pentetraktys 4D.
Recibes TESIS y ANTÍTESIS: produce la SÍNTESIS — qué sobrevive de la tesis,
qué corrige la antítesis, y la conclusión validada final.
Termina con una línea 'HYBRYS: <bajo|medio|alto>' según cuánto tuvo que corregirse la tesis.
Responde en español, conciso y claro."""

        synth_msgs = [
            {
                "role": "user",
                "content": f"TESIS:\n{thesis[:3500]}\n\nANTÍTESIS:\n{antithesis[:2500]}",
            }
        ]

        synthesis, _ = await self._call_ai(synth_msgs, synthesis_prompt, 2048)
        result["synthesis"] = synthesis

        return result

    # ═══════════════════════════════════════════════════════════
    # API PÚBLICA
    # ═══════════════════════════════════════════════════════════

    def get_or_create_conv(self, conv_id: str, threema_id: Optional[str] = None) -> Conversation:
        """Obtiene o crea una conversación."""
        if conv_id not in self.conversations:
            # Intentar cargar de DB
            row = self.db.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)).fetchone()
            if row:
                conv = Conversation(
                    id=row[0],
                    mode=Mode(row[1]),
                    depth=Depth(row[2]),
                    thinking=Thinking(row[3]),
                    created_at=row[4],
                    threema_id=row[5],
                )
                # Cargar mensajes
                msgs = self.db.execute(
                    "SELECT role, content, thinking, hybrys, timestamp FROM messages WHERE conv_id=? ORDER BY id",
                    (conv_id,)
                ).fetchall()
                conv.messages = [
                    Message(role=r[0], content=r[1], thinking=r[2],
                            hybrys=json.loads(r[3]) if r[3] else None, timestamp=r[4])
                    for r in msgs
                ]
                self.conversations[conv_id] = conv
            else:
                conv = Conversation(id=conv_id, threema_id=threema_id)
                self.conversations[conv_id] = conv
                self._save_conv(conv)

        return self.conversations[conv_id]

    async def chat(
        self,
        message: str,
        conv_id: Optional[str] = None,
        mode: Mode = Mode.CATALYST,
        depth: Depth = Depth.MEDIUM,
        thinking: Thinking = Thinking.OFF,
        research: bool = False,
        dialectic: bool = False,
        threema_id: Optional[str] = None,
    ) -> BotResponse:
        """
        Procesa un mensaje y retorna la respuesta completa.

        Args:
            message: Texto del usuario
            conv_id: ID de conversación (se crea si no existe)
            mode: Modo Catalyst
            depth: Profundidad
            thinking: Nivel de razonamiento
            research: Modo investigación profunda
            dialectic: Activar ciclo Tesis→Antítesis→Síntesis
            threema_id: ID del usuario en Threema (opcional)

        Returns:
            BotResponse con contenido, razonamiento, hybrys, etc.
        """
        t0 = time.time()

        # Conversación
        cid = conv_id or hashlib.sha256(f"{threema_id or 'anon'}{time.time()}".encode()).hexdigest()[:12]
        conv = self.get_or_create_conv(cid, threema_id)
        conv.mode = mode
        conv.depth = depth
        conv.thinking = thinking

        # Añadir mensaje del usuario
        user_msg = Message(role="user", content=message)
        conv.messages.append(user_msg)
        self._save_msg(cid, user_msg)

        # System prompt
        system_prompt = self._build_system_prompt(mode, depth, thinking, research)
        max_tokens = self._get_max_tokens(depth, research, thinking)

        # Historial para la API
        api_messages = [
            {"role": m.role, "content": m.content}
            for m in conv.messages[-20:]  # últimos 20 mensajes para contexto
        ]

        # ─── TESIS: Respuesta principal ───────────────────────
        log.info(f"◆ Chat [{mode.value}/{depth.value}] | {len(conv.messages)} msgs | {len(message)} chars")
        content, reasoning = await self._call_ai(api_messages, system_prompt, max_tokens)

        # Guardar respuesta
        assistant_msg = Message(role="assistant", content=content, thinking=reasoning)
        conv.messages.append(assistant_msg)
        self._save_msg(cid, assistant_msg)

        # ─── HYBRYS Detection ─────────────────────────────────
        hybrys = await self._detect_hybrys(message, content)
        assistant_msg.hybrys = hybrys
        self._save_msg(cid, assistant_msg)  # update hybrys

        # ─── DIALÉCTICA ───────────────────────────────────────
        dialectic_stages = None
        if dialectic and content.strip():
            log.info(f"⚔ Dialéctica activada para {cid}")
            dialectic_stages = await self._dialectic(message, content, mode, depth)

        # ─── Guardar conversación ────────────────────────────
        self._save_conv(conv)

        elapsed = (time.time() - t0) * 1000

        return BotResponse(
            content=content,
            thinking=reasoning,
            hybrys=hybrys,
            mode=mode.value,
            tokens_used=len(content.split()) + len(reasoning.split()) if reasoning else 0,
            elapsed_ms=round(elapsed, 1),
            dialectic_stages=dialectic_stages,
        )

    async def chat_stream(
        self,
        message: str,
        conv_id: Optional[str] = None,
        mode: Mode = Mode.CATALYST,
        depth: Depth = Depth.MEDIUM,
        thinking: Thinking = Thinking.OFF,
        research: bool = False,
        dialectic: bool = False,
        threema_id: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """
        Versión streaming: yield de tokens conforme llegan.
        Para integración con Threema (no soporta streaming nativo,
        pero podemos usarlo para APIs que sí).
        """
        t0 = time.time()
        cid = conv_id or hashlib.sha256(f"{threema_id or 'anon'}{time.time()}".encode()).hexdigest()[:12]
        conv = self.get_or_create_conv(cid, threema_id)

        user_msg = Message(role="user", content=message)
        conv.messages.append(user_msg)
        self._save_msg(cid, user_msg)

        system_prompt = self._build_system_prompt(mode, depth, thinking, research)
        max_tokens = self._get_max_tokens(depth, research, thinking)

        api_messages = [{"role": m.role, "content": m.content} for m in conv.messages[-20:]]
        full_messages = [{"role": "system", "content": system_prompt}] + api_messages

        content = ""
        reasoning = ""

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=full_messages,
                stream=True,
                max_tokens=max_tokens,
            )

            for chunk in completion:
                delta = chunk.choices[0].delta if chunk.choices else None
                if not delta:
                    continue

                r = getattr(delta, "reasoning_content", None) or getattr(delta, "reasoning", None)
                if r:
                    reasoning += r
                    yield json.dumps({"type": "thinking", "content": r}) + "\n"

                c = delta.content or ""
                if c:
                    content += c
                    yield json.dumps({"type": "text", "content": c}) + "\n"

        except Exception as e:
            log.error(f"Stream error: {e}")
            yield json.dumps({"type": "error", "content": str(e)[:200]}) + "\n"

        # Guardar
        assistant_msg = Message(role="assistant", content=content, thinking=reasoning)
        conv.messages.append(assistant_msg)
        self._save_msg(cid, assistant_msg)

        hybrys = await self._detect_hybrys(message, content)
        assistant_msg.hybrys = hybrys
        self._save_msg(cid, assistant_msg)
        self._save_conv(conv)

        yield json.dumps({"type": "done", "hybrys": hybrys, "elapsed_ms": round((time.time() - t0) * 1000, 1)}) + "\n"

    def set_mode(self, conv_id: str, mode: Mode):
        """Cambia el modo de una conversación."""
        conv = self.get_or_create_conv(conv_id)
        conv.mode = mode
        self._save_conv(conv)

    def set_depth(self, conv_id: str, depth: Depth):
        """Cambia la profundidad."""
        conv = self.get_or_create_conv(conv_id)
        conv.depth = depth
        self._save_conv(conv)

    def set_thinking(self, conv_id: str, thinking: Thinking):
        """Cambia el nivel de razonamiento."""
        conv = self.get_or_create_conv(conv_id)
        conv.thinking = thinking
        self._save_conv(conv)

    def clear_conv(self, conv_id: str):
        """Borra una conversación."""
        self.db.execute("DELETE FROM messages WHERE conv_id=?", (conv_id,))
        self.db.execute("DELETE FROM conversations WHERE id=?", (conv_id,))
        self.db.commit()
        self.conversations.pop(conv_id, None)

    def list_convs(self, threema_id: Optional[str] = None) -> List[Dict]:
        """Lista conversaciones."""
        if threema_id:
            rows = self.db.execute(
                "SELECT id, mode, depth, thinking, created_at, title FROM conversations WHERE threema_id=? ORDER BY created_at DESC",
                (threema_id,)
            ).fetchall()
        else:
            rows = self.db.execute(
                "SELECT id, mode, depth, thinking, created_at, title FROM conversations ORDER BY created_at DESC"
            ).fetchall()
        return [
            {"id": r[0], "mode": r[1], "depth": r[2], "thinking": r[3], "created_at": r[4], "title": r[5]}
            for r in rows
        ]

    def status(self) -> Dict[str, Any]:
        """Estado del bot."""
        return {
            "version": VERSION,
            "bell": BELL,
            "model": self.model,
            "provider": self.base_url,
            "active_conversations": len(self.conversations),
            "total_conversations": self.db.execute("SELECT COUNT(*) FROM conversations").fetchone()[0],
            "total_messages": self.db.execute("SELECT COUNT(*) FROM messages").fetchone()[0],
            "modes_available": list(MODES.keys()),
            "threema_connected": self.threema_gateway is not None,
            "timestamp": datetime.now().isoformat(),
        }


# ═══════════════════════════════════════════════════════════════
# CLI rápida para test
# ═══════════════════════════════════════════════════════════════

async def main():
    """Demo CLI del bot."""
    import asyncio

    bot = CatalystBot()
    print(f"\n◆ Catalyst Bot v{VERSION}")
    print(f"  BELL {BELL} | DeepSeek API")
    print(f"  Conversaciones: {bot.status()['total_conversations']}")
    print(f"  Mensajes: {bot.status()['total_messages']}")
    print()

    # Test rápido
    response = await bot.chat(
        message="Explica qué es el sistema Catalyst en 3 frases.",
        mode=Mode.CATALYST,
        depth=Depth.SURFACE,
    )
    print(f"◆ Respuesta [{response.mode} | {response.elapsed_ms}ms]:")
    print(response.content[:500])
    if response.hybrys:
        h = response.hybrys
        print(f"\nΔ Hybrys: {h['hybrys']} ({h['nivel']}) | C:{h['confianza']} V:{h['validacion']}")
    print(f"\nTokens: {response.tokens_used} | DB: {bot.db_path}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
