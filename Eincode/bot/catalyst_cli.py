#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
CATALYST CLI — Terminal Chat Interface
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

Un solo comando. Todo Catalyst en tu terminal.
Como Claude Code pero para el ecosistema Catalyst.

USO:
  python catalyst_cli.py                           # Chat interactivo (auto-detecta repo)
  python catalyst_cli.py --api-key sk-xxx          # Con API key
  python catalyst_cli.py "mensaje"                  # One-shot con tools
  python catalyst_cli.py --mode pentetraktys       # Modo específico
  python catalyst_cli.py --project ~/mi-repo       # Elegir repositorio
  python catalyst_cli.py --no-tools                # Solo chat, sin herramientas
  python catalyst_cli.py --serve                   # Iniciar + servidor web
  python catalyst_cli.py --threema                 # Iniciar + Threema Bridge

COMANDOS DENTRO DEL CHAT:
  /mode <modo>    · /depth <nivel>  · /think <nivel>
  /research       · /dialectic      · /game <juego>
  /hybrys         · /onto           · /new
  /save           · /load <id>      · /history
  /serve          · /status         · /help · /exit

═══════════════════════════════════════════════════════════════════════════
"""

import asyncio, sys, os, io, json, re, time, hashlib, sqlite3, logging
import subprocess, shutil, fnmatch
import threading, signal
try: import readline
except ImportError: readline = None  # Windows
from pathlib import Path
from typing import Optional, Dict, List, Any
from datetime import datetime

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except: pass

logging.basicConfig(level=logging.WARNING)
log = logging.getLogger("catalyst-cli")

# ─── Dependencies ─────────────────────────────────────────────
try: from openai import OpenAI
except ImportError:
    print("ERROR: pip install openai")
    sys.exit(1)

try: from dotenv import load_dotenv
except ImportError:
    print("ERROR: pip install python-dotenv")
    sys.exit(1)

# Load .env — orden: local primero (más prioritario), luego root, luego home
for p in [os.path.join(os.path.dirname(__file__), ".env"),
          os.path.expanduser("~/.catalyst.env"),
          os.path.join(os.path.dirname(__file__), "../../.env"),
          ".env"]:
    if os.path.exists(p): load_dotenv(p, override=True)

# ═══════════════════════════════════════════════════════════════
# COLORES ANSI
# ═══════════════════════════════════════════════════════════════
class C:
    R='\033[0m'; G='\033[0;32m'; DG='\033[0;36m'; Y='\033[0;33m'
    RD='\033[0;31m'; M='\033[0;35m'; B='\033[0;34m'; W='\033[1;37m'
    D='\033[0;90m'; BOLD='\033[1m'; DIM='\033[2m'
    @classmethod
    def off(cls):
        for k in dir(cls):
            if not k.startswith('_') and isinstance(getattr(cls,k),str): setattr(cls,k,'')

if '--no-color' in sys.argv: C.off()

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

MODES = {
    "catalyst":     ("◆","Catalyst",C.G),
    "pentetraktys": ("Δ","Pentetraktys 4D",C.RD),
    "boo":          ("ψ","Boo Compiler",C.Y),
    "zettelkasten": ("‡","Zettelkasten",C.D),
    "cobol":        ("⌬","COBOL Empresarial",C.B),
}
DEPTHS = {"surface":"Superficie","medium":"Medio","deep":"Profundo","frontier":"Frontera"}
THINKS = {"off":"Rápido","high":"Pensar","max":"Profundo"}
GAMES = {
    "sprachspiel":"Wittgenstein: significado como uso",
    "differance":"Derrida: desplazamiento del sentido",
    "mirror":"Lacan: estadio del espejo",
    "deep_structure":"Chomsky: estructura profunda",
    "grice":"Grice: implicaturas",
    "polyphony":"Bakhtin: polifonía",
    "semiosis":"Peirce: cadena triádica",
    "casimir":"Vacío Cuántico: fluctuaciones del sentido",
}

SYSTEM_BASE = """Eres Catalyst AI — sistema de banca autopoiética y conocimiento global.
BELL 13450.50 | OSHIRO ERC-26+ | Token CAT ($1.6184 MXN) | Banxico Oracle.
Responde en español. Sé profundo, ontológico y expansivo.

ONTOLOGÍA: Distingue lo que ES de lo que PARECE SER. Categoriza el ser.
DEONTOLOGÍA OBSERVACIONAL: Eres un banco mundial, no un tribunal moral.
Observas dimensiones éticas sin dictaminar bien/mal.
La ética no está escrita en ninguna ley natural — es información, no veredicto.
Reconoces tu velo de ignorancia rawlsiano."""


# ═══════════════════════════════════════════════════════════════
# TOOLS — Function calling (OpenAI/DeepSeek compatible)
# ═══════════════════════════════════════════════════════════════

TOOLS = [
    # ── FILE OPERATIONS ──────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Lee el contenido de un archivo del proyecto. Usa path relativo al proyecto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Ruta relativa al proyecto del archivo a leer"},
                    "offset": {"type": "integer", "description": "Línea desde donde empezar (1-based)"},
                    "limit": {"type": "integer", "description": "Máximo de líneas a leer (default 2000)"}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Crea o sobrescribe un archivo en el proyecto. USA CON PRECAUCIÓN. Siempre lee el archivo primero si ya existe.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Ruta relativa al proyecto"},
                    "content": {"type": "string", "description": "Contenido completo del archivo"}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_file",
            "description": "Reemplazo exacto de texto en un archivo existente. old_string debe coincidir EXACTAMENTE (incluyendo indentación).",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Ruta relativa al proyecto"},
                    "old_string": {"type": "string", "description": "Texto exacto a reemplazar"},
                    "new_string": {"type": "string", "description": "Texto nuevo"},
                    "replace_all": {"type": "boolean", "description": "Reemplazar todas las ocurrencias (default false)"}
                },
                "required": ["path", "old_string", "new_string"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "glob",
            "description": "Busca archivos por patrón glob. Ej: '**/*.py', '*.json', 'src/**/*.sol'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {"type": "string", "description": "Patrón glob"},
                    "path": {"type": "string", "description": "Directorio base (default: raíz del proyecto)"}
                },
                "required": ["pattern"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "grep",
            "description": "Busca texto/regex en archivos del proyecto. Soporta filtrado por tipo de archivo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {"type": "string", "description": "Patrón regex a buscar"},
                    "path": {"type": "string", "description": "Directorio donde buscar (default: raíz)"},
                    "glob": {"type": "string", "description": "Filtro de archivos (ej: '*.py')"},
                    "output_mode": {"type": "string", "enum": ["content", "files_with_matches", "count"]},
                    "head_limit": {"type": "integer", "description": "Límite de resultados (default 40)"},
                    "-i": {"type": "boolean", "description": "Case insensitive"}
                },
                "required": ["pattern"]
            }
        }
    },
    # ── SHELL EXECUTION ─────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "bash",
            "description": "Ejecuta un comando en terminal (bash/sh). Usa para: git, npm, python, curl, find, grep, etc. NUNCA comandos destructivos sin confirmación.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Comando shell a ejecutar. Ej: 'git status', 'ls -la src/'"},
                    "timeout": {"type": "integer", "description": "Timeout en segundos (default 120)"},
                    "description": {"type": "string", "description": "Descripción corta de qué hace el comando"}
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "powershell",
            "description": "Ejecuta un comando PowerShell en Windows. NO uses para git/npm/python — usa bash.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Comando PowerShell. Ej: 'Get-ChildItem src/ -Recurse -Filter *.ts'"},
                    "timeout": {"type": "integer", "description": "Timeout en segundos (default 120)"},
                    "description": {"type": "string", "description": "Descripción corta"}
                },
                "required": ["command"]
            }
        }
    },
    # ── PROJECT TOOLS ──────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "list_dir",
            "description": "Lista el contenido de un directorio del proyecto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Ruta relativa al proyecto (default: raíz)"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "git_status",
            "description": "Muestra el estado del repositorio git (working tree). Solo lectura.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "git_diff",
            "description": "Muestra los cambios (diff) del repositorio.",
            "parameters": {
                "type": "object",
                "properties": {
                    "staged": {"type": "boolean", "description": "Mostrar staged changes (default: unstaged)"}
                }
            }
        }
    },
]

CLI_AUGMENT = """
[MODO CLI ACTIVADO — HABILIDADES DE TERMINAL]
Tienes acceso a herramientas del sistema para leer, escribir y ejecutar:

📄 ARCHIVOS: read_file, write_file, edit_file, glob, grep, list_dir
🐚 SHELL: bash (POSIX sh), powershell (Windows)
📋 PROYECTO: git_status, git_diff

REGLAS DE ORO:
1. NUNCA ejecutes comandos destructivos sin confirmación del usuario
2. Siempre usa read_file ANTES de edit_file para verificar contenido exacto
3. Confirma con el usuario antes de modificar archivos fuera del scope
4. Los comandos tienen timeout de 120s
5. Reporta SIEMPRE el resultado de cada herramienta al usuario en español
6. Si un comando falla, explica el error y sugiere corrección
7. Mantén tu identidad Pentetraktys 4D — el CLI es una extensión, no un reemplazo
8. Estándar BELL 13450.50 en todas las operaciones"""

# Íconos por tipo de tool
TOOL_ICONS = {
    "read_file": "📄", "write_file": "✏️", "edit_file": "🔧",
    "bash": "$", "powershell": "⚡", "glob": "🔍", "grep": "🔎",
    "list_dir": "📁", "git_status": "📋", "git_diff": "📊"
}

# Comandos bloqueados (patrones regex)
BLOCKED_COMMANDS = [
    r"rm\s+-rf\s+/", r"rm\s+-rf\s+~", r"del\s+/[fs]\s+", r"format\s+[a-z]:",
    r"diskpart", r"fdisk", r"dd\s+if=", r"mkfs",
    r"git\s+push\s+--force\s+--no-verify", r"git\s+push\s+-f\s+origin\s+main",
    r"git\s+reset\s+--hard\s+origin", r"git\s+clean\s+-fdx",
    r"curl.*\|\s*(ba)?sh", r"wget.*\|\s*(ba)?sh",
    r"sudo\s", r"runas\s",
]

def detect_project_root() -> str:
    """Sube desde cwd hasta encontrar .git. Si no hay, usa cwd."""
    p = Path.cwd()
    while p != p.parent:
        if (p / ".git").exists():
            return str(p)
        p = p.parent
    return str(Path.cwd())


class ToolExecutor:
    """Ejecuta herramientas CLI localmente en el project_root."""

    def __init__(self, project_root: str):
        self.root = Path(project_root).resolve()
        self.max_output = 50000

    def execute(self, name: str, args: dict) -> dict:
        """Dispatch a handler. Retorna {success, output, error}."""
        handlers = {
            "read_file": self._read_file,
            "write_file": self._write_file,
            "edit_file": self._edit_file,
            "glob": self._glob,
            "grep": self._grep,
            "bash": self._bash,
            "powershell": self._powershell,
            "list_dir": self._list_dir,
            "git_status": self._git_status,
            "git_diff": self._git_diff,
        }
        handler = handlers.get(name)
        if not handler:
            return {"success": False, "output": "", "error": f"Herramienta desconocida: {name}"}
        try:
            return handler(args)
        except Exception as e:
            return {"success": False, "output": "", "error": str(e)}

    def _resolve(self, filepath: str) -> Path:
        """Resuelve un path relativo al project_root, bloqueando escapes."""
        p = (self.root / filepath).resolve()
        # Permitir solo dentro del proyecto o paths absolutos dentro del proyecto
        if not str(p).startswith(str(self.root)):
            raise ValueError(f"Path fuera del proyecto: {filepath}")
        return p

    def _validate_command(self, cmd: str) -> bool:
        """Valida que el comando no esté bloqueado."""
        import re as _re
        for pattern in BLOCKED_COMMANDS:
            if _re.search(pattern, cmd, _re.IGNORECASE):
                return False
        return True

    # ── File operations ─────────────────────────────────────

    def _read_file(self, args: dict) -> dict:
        path = self._resolve(args.get("path", ""))
        offset = max(1, int(args.get("offset", 1)))
        limit = min(5000, int(args.get("limit", 2000)))

        if not path.exists():
            return {"success": False, "output": "", "error": f"No encontrado: {args.get('path')}"}
        if path.stat().st_size > 5 * 1024 * 1024:
            return {"success": False, "output": "", "error": "Archivo > 5MB"}

        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        start = offset - 1
        end = min(len(lines), start + limit)
        selected = lines[start:end]

        formatted = "\n".join(f"{i+1:4d}\t{line}" for i, line in enumerate(selected, start))
        header = f"📄 {args.get('path')} (líneas {start+1}-{end} de {len(lines)})\n"
        output = header + formatted
        truncated = len(output) > self.max_output
        if truncated:
            output = output[:self.max_output] + f"\n… [{len(output)-self.max_output} chars omitidos]"
        return {"success": True, "output": output}

    def _write_file(self, args: dict) -> dict:
        path = self._resolve(args.get("path", ""))
        content = args.get("content", "")

        existed = path.exists()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        size_kb = len(content.encode("utf-8")) / 1024
        return {"success": True,
                "output": f"{'✅ Sobrescrito' if existed else '✅ Creado'}: {args.get('path')} ({size_kb:.1f} KB)"}

    def _edit_file(self, args: dict) -> dict:
        path = self._resolve(args.get("path", ""))
        old = args.get("old_string", "")
        new = args.get("new_string", "")
        replace_all = args.get("replace_all", False)

        if not path.exists():
            return {"success": False, "output": "", "error": f"No encontrado: {args.get('path')}"}

        content = path.read_text(encoding="utf-8")
        count = content.count(old)
        if count == 0:
            return {"success": False, "output": "", "error": "old_string no encontrado. Verifica indentación."}
        if count > 1 and not replace_all:
            return {"success": False, "output": "",
                    "error": f"old_string aparece {count} veces. Usa replace_all=true o sé más específico."}

        new_content = content.replace(old, new) if replace_all else content.replace(old, new, 1)
        path.write_text(new_content, encoding="utf-8")
        return {"success": True,
                "output": f"✅ Editado: {args.get('path')} — {count if replace_all else 1} reemplazo(s)"}

    def _glob(self, args: dict) -> dict:
        pattern = args.get("pattern", "*")
        base = self._resolve(args.get("path", ".")) if args.get("path") else self.root

        results = []
        max_results = 200
        for f in base.rglob("*"):
            if len(results) >= max_results:
                break
            if f.is_file():
                rel = f.relative_to(self.root)
                # Skip dirs
                parts = rel.parts
                if any(p in (".git", "node_modules", ".next", "__pycache__", "dist", ".turbo") for p in parts):
                    continue
                if fnmatch.fnmatch(f.name, pattern) or fnmatch.fnmatch(str(rel), pattern):
                    results.append(str(rel).replace("\\", "/"))

        if not results:
            return {"success": True, "output": f"🔍 Ningún archivo coincide con '{pattern}'"}

        shown = results[:100]
        out = f"🔍 {len(results)} archivos coinciden con '{pattern}':\n" + "\n".join(f"  {r}" for r in shown)
        if len(results) > 100:
            out += f"\n  … y {len(results)-100} más"
        return {"success": True, "output": out}

    def _grep(self, args: dict) -> dict:
        pattern = args.get("pattern", "")
        base = self._resolve(args.get("path", ".")) if args.get("path") else self.root
        glob_filter = args.get("glob")
        output_mode = args.get("output_mode", "files_with_matches")
        case_insensitive = args.get("-i", False)
        head_limit = min(100, int(args.get("head_limit", 40)))

        import re as _re
        flags = _re.IGNORECASE if case_insensitive else 0
        try:
            regex = _re.compile(pattern, flags)
        except _re.error as e:
            return {"success": False, "output": "", "error": f"Regex inválido: {e}"}

        results = []
        max_matches = 100
        for f in base.rglob("*"):
            if len(results) >= max_matches:
                break
            if not f.is_file():
                continue
            parts = f.relative_to(self.root).parts
            if any(p in (".git", "node_modules", ".next", "__pycache__", "dist", ".turbo") for p in parts):
                continue
            if glob_filter and not fnmatch.fnmatch(f.name, glob_filter):
                continue
            try:
                content = f.read_text(encoding="utf-8", errors="replace")
                lines = content.splitlines()
                file_hits = []
                for i, line in enumerate(lines):
                    if regex.search(line):
                        file_hits.append((i + 1, line.strip()[:200]))
                        if len(file_hits) >= 50:
                            break
                if file_hits:
                    rel = str(f.relative_to(self.root)).replace("\\", "/")
                    if output_mode == "files_with_matches":
                        results.append(f"  📄 {rel}")
                    elif output_mode == "content":
                        for ln, txt in file_hits[:5]:
                            results.append(f"  {rel}:{ln}  {txt}")
                    elif output_mode == "count":
                        results.append(f"  {rel}: {len(file_hits)} coincidencias")
            except (UnicodeDecodeError, PermissionError):
                continue

        if not results:
            return {"success": True, "output": f"🔎 Ningún archivo contiene '{pattern}'"}

        limited = results[:head_limit]
        out = f"🔎 {len(results)} resultados para '{pattern}':\n" + "\n".join(limited)
        if len(results) > head_limit:
            out += f"\n  … y {len(results)-head_limit} más"
        return {"success": True, "output": out[:self.max_output]}

    # ── Shell execution ─────────────────────────────────────

    def _run_shell(self, command: str, shell: str, timeout: int = 120) -> dict:
        if not self._validate_command(command):
            return {"success": False, "output": "", "error": "🚫 Comando bloqueado por seguridad"}

        timeout = min(timeout, 300)
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True,
                timeout=timeout, cwd=str(self.root),
                encoding="utf-8", errors="replace"
            )
            output = result.stdout
            if result.stderr:
                output += ("\n" if output else "") + result.stderr
            output = output.strip() or "(sin salida)"
            if len(output) > self.max_output:
                output = output[:self.max_output] + f"\n… [{len(output)-self.max_output} chars omitidos]"

            return {"success": result.returncode == 0,
                    "output": output,
                    "error": f"exit code: {result.returncode}" if result.returncode != 0 else None}
        except subprocess.TimeoutExpired:
            return {"success": False, "output": "", "error": f"⏰ Timeout ({timeout}s)"}
        except Exception as e:
            return {"success": False, "output": "", "error": str(e)}

    def _bash(self, args: dict) -> dict:
        cmd = args.get("command", "")
        timeout = int(args.get("timeout", 120))
        shell = "bash" if shutil.which("bash") else "sh"
        return self._run_shell(cmd, shell, timeout)

    def _powershell(self, args: dict) -> dict:
        cmd = args.get("command", "")
        timeout = int(args.get("timeout", 120))
        return self._run_shell(cmd, "powershell.exe", timeout)

    # ── Project tools ───────────────────────────────────────

    def _list_dir(self, args: dict) -> dict:
        target = self._resolve(args.get("path", ".")) if args.get("path") else self.root
        if not target.exists():
            return {"success": False, "output": "", "error": f"No encontrado: {args.get('path', '.')}"}

        entries = sorted(target.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
        dirs = [f"  📁 {e.name}/" for e in entries if e.is_dir()]
        files = [f"  📄 {e.name}" for e in entries if e.is_file()]

        rel = str(target.relative_to(self.root)) if str(target).startswith(str(self.root)) else str(target)
        out = f"📁 {rel or '.'} ({len(dirs)} dirs, {len(files)} archivos)\n"
        out += "\n".join(dirs[:50])
        if len(dirs) > 50:
            out += f"\n  … y {len(dirs)-50} dirs más"
        out += "\n" + "\n".join(files[:50])
        if len(files) > 50:
            out += f"\n  … y {len(files)-50} archivos más"
        return {"success": True, "output": out[:self.max_output]}

    def _git_status(self, args: dict = None) -> dict:
        return self._run_shell("git status --short", "bash" if shutil.which("bash") else "sh", 30)

    def _git_diff(self, args: dict) -> dict:
        cmd = "git diff --staged" if args.get("staged") else "git diff"
        r = self._run_shell(cmd, "bash" if shutil.which("bash") else "sh", 60)
        return r


class CatalystEngine:
    def __init__(self, api_key: str = None, project_root: str = None, tools_enabled: bool = True):
        key = api_key or os.getenv("DEEPSEEK_API_KEY") or os.getenv("AI_API_KEY","")
        if not key:
            print(f"\n{C.RD}╔════════════════════════════════════════════════╗")
            print(f"║  ◆ CATALYST CLI — DeepSeek API Key requerida  ║")
            print(f"╠════════════════════════════════════════════════╣")
            print(f"║  export DEEPSEEK_API_KEY=sk-tu-key            ║")
            print(f"║  O: --api-key sk-tu-key                       ║")
            print(f"║  https://platform.deepseek.com/api_keys       ║")
            print(f"╚════════════════════════════════════════════════╝{C.R}")
            sys.exit(1)

        self.client = OpenAI(base_url="https://api.deepseek.com", api_key=key, timeout=180, max_retries=2)
        self.model = os.getenv("AI_MODEL","deepseek-chat")
        self.mode = "catalyst"
        self.depth = "medium"
        self.think = "off"
        self.research = False
        self.dialectic = False
        self.game: Optional[str] = None
        self.msgs: List[Dict] = []
        self.cid = datetime.now().strftime("%Y%m%d%H%M")
        self.last = ""
        self.hybrys: Optional[Dict] = None
        self.tool_results: List[Dict] = []
        # ─── CLI Tools ───────────────────────────────────────────
        self.project_root = project_root or detect_project_root()
        self.tools_enabled = tools_enabled
        self.executor = ToolExecutor(self.project_root)

        # DB
        dp = os.path.join(os.path.dirname(__file__), "catalyst_cli.db")
        self.db = sqlite3.connect(dp)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("CREATE TABLE IF NOT EXISTS convs(id TEXT PRIMARY KEY, title TEXT, mode TEXT, depth TEXT, created_at TEXT DEFAULT(datetime('now')), msgs TEXT)")
        self.db.commit()

    def _system(self) -> str:
        m = MODES[self.mode]
        extras = {"pentetraktys": "\n\nESTRUCTURA SIEMPRE: TESIS → ANTITESIS → SINTESIS → CONCLUSION → HYBRYS.",
                  "boo": "\n\nEres el Boo Compiler. Traduce a física cuántica, efectos Casimir, fractales. Respaldo matemático.",
                  "zettelkasten": "\n\nCrea notas atómicas con ID [[YYYYMMDDHHMM]] y enlaces bidireccionales.",
                  "cobol": "\n\nESTRUCTURA: IDENTIFICATION DIVISION. ENVIRONMENT DIVISION. DATA DIVISION (88-LEVEL). PROCEDURE DIVISION. + RESUMEN EJECUTIVO."}
        depth_prompts = {"surface":"Sé conciso. 2-3 párrafos.","medium":"Análisis detallado.","deep":"Desarrollo profundo y extenso. Todos los ángulos.","frontier":"Cascada ontológica. MÁXIMA extensión. TODOS los caminos."}
        think_prompts = {"high":"Razonamiento paso a paso visible.","max":"RAZONAMIENTO MÁXIMO. Cada paso. Casos límite. ILIMITADO."}

        parts = [SYSTEM_BASE, extras.get(self.mode,""), depth_prompts.get(self.depth,"")]
        if self.think != "off": parts.append(think_prompts.get(self.think,""))
        if self.research: parts.append("[INVESTIGACIÓN PROFUNDA] Multi-ángulo. Fuentes. Contraargumentos. MÁXIMA extensión.")
        if self.game: parts.append(f"[JUEGO: {self.game}] {GAMES.get(self.game,'')}. Aplica este marco.")
        if self.tools_enabled:
            parts.append(f"[REPO: {self.project_root}]\n{CLI_AUGMENT}")
        return "\n\n".join(filter(None, parts))

    def _display_tool_call(self, tc, result: dict):
        """Renderiza una tool call en la terminal estilo Claude Code."""
        name = tc.function.name
        try:
            args_obj = json.loads(tc.function.arguments)
        except Exception:
            args_obj = {}
        preview = tc.function.arguments[:80].replace("\n", " ")

        icon = TOOL_ICONS.get(name, "🔧")
        status_icon = f"{C.G}✓{C.R}" if result["success"] else f"{C.RD}✗{C.R}"
        print(f"  {icon} {status_icon} {C.BOLD}{name}{C.R} {C.DIM}{preview}{C.R}")

        output = result.get("output", "")
        if output:
            lines = output.splitlines()
            # Mostrar primeras 10 líneas
            for line in lines[:10]:
                print(f"  {C.DIM}{line}{C.R}")
            if len(lines) > 10:
                print(f"  {C.DIM}… ({len(lines)} líneas){C.R}")
        if result.get("error"):
            print(f"  {C.RD}Error: {result['error']}{C.R}")

    def chat(self, msg: str, stream: bool = True) -> str:
        system = self._system()
        api_msgs = [{"role":"system","content":system}] + self.msgs[-30:] + [{"role":"user","content":msg}]
        self.msgs.append({"role":"user","content":msg})
        self.tool_results = []

        try:
            # ─── Modo normal sin tools ──────────────────────────
            if not self.tools_enabled:
                return self._stream_text(api_msgs) if stream else self._nonstream_text(api_msgs)

            # ─── Tool calling loop ──────────────────────────────
            MAX_ITER = 5
            current_msgs = list(api_msgs)
            final_content = ""

            for iteration in range(MAX_ITER):
                has_tools = iteration < MAX_ITER - 1  # última iteración sin tools si no han sido útiles
                kwargs = {
                    "model": self.model,
                    "messages": current_msgs,
                    "max_tokens": 16384 if self.depth == "frontier" else 8192,
                }
                if has_tools:
                    kwargs["tools"] = TOOLS
                    kwargs["tool_choice"] = "auto"

                resp = self.client.chat.completions.create(**kwargs)
                msg_choice = resp.choices[0].message

                # ── ¿El modelo llamó herramientas? ──────────
                if msg_choice.tool_calls:
                    # Mostrar tool calls en terminal
                    for tc in msg_choice.tool_calls:
                        try:
                            args = json.loads(tc.function.arguments)
                        except Exception:
                            args = {}
                        result = self.executor.execute(tc.function.name, args)
                        self._display_tool_call(tc, result)
                        self.tool_results.append({
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                            "success": result["success"],
                            "output": result.get("output", "")[:500],
                            "error": result.get("error"),
                        })
                        current_msgs.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": result["output"] if result["success"] else f"Error: {result.get('error', 'desconocido')}"
                        })

                    # Añadir assistant message con tool_calls al historial
                    assistant_tool_msg = {
                        "role": "assistant",
                        "content": msg_choice.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments
                                }
                            }
                            for tc in msg_choice.tool_calls
                        ]
                    }
                    current_msgs.append(assistant_tool_msg)

                    # Si el modelo también generó texto, guardarlo
                    if msg_choice.content:
                        final_content = msg_choice.content

                    continue  # siguiente iteración

                # ── Respuesta final (texto) ─────────────────
                final_content = msg_choice.content or final_content or ""
                if final_content:
                    print(final_content)
                self.msgs.append({"role": "assistant", "content": final_content})
                self.last = final_content

                # Resumen de herramientas
                if self.tool_results:
                    ok = sum(1 for r in self.tool_results if r["success"])
                    total = len(self.tool_results)
                    print(f"\n{C.D}💻 {ok}/{total} herramientas{' exitosa' if ok==1 else ' exitosas'}{C.R}")
                return final_content

            # Si salimos del loop sin texto final
            if not final_content and self.tool_results:
                final_content = "(Herramientas ejecutadas — usa los resultados para responder)"
                print(f"\n{C.Y}{final_content}{C.R}")
            return final_content or ""

        except Exception as e:
            err = f"\n{C.RD}Error: {e}{C.R}"
            print(err); return err

    def _stream_text(self, api_msgs: list) -> str:
        """Streaming sin tools (comportamiento original)."""
        resp = self.client.chat.completions.create(
            model=self.model, messages=api_msgs, stream=True,
            max_tokens=16384 if self.depth=="frontier" else 8192
        )
        content = ""; reasoning = ""
        for chunk in resp:
            d = chunk.choices[0].delta if chunk.choices else None
            if not d: continue
            r = getattr(d, "reasoning_content", None)
            if r: reasoning += r; sys.stdout.write(f"{C.DIM}{r}{C.R}"); sys.stdout.flush()
            c = d.content or ""
            if c: content += c; sys.stdout.write(c); sys.stdout.flush()
        self.msgs.append({"role":"assistant","content":content})
        self.last = content
        return content

    def _nonstream_text(self, api_msgs: list) -> str:
        """Non-streaming sin tools."""
        resp = self.client.chat.completions.create(
            model=self.model, messages=api_msgs, max_tokens=4096
        )
        content = resp.choices[0].message.content
        self.msgs.append({"role":"assistant","content":content})
        self.last = content
        print(content)
        return content

    async def check_hybrys(self, q: str, a: str) -> Dict:
        p = f"Analiza Hybrys (sobreconfianza sin validación). PREGUNTA: {q[:400]}\nRESPUESTA: {a[:1200]}\nJSON: {{\"confianza\":0.X,\"validacion\":0.X,\"hybrys\":0.X,\"nivel\":\"ok|warning|critical\",\"razon\":\"breve\"}}"
        try:
            r = self.client.chat.completions.create(model=self.model, messages=[{"role":"user","content":p}], max_tokens=200, temperature=0.3)
            m = re.search(r'\{.*\}', r.choices[0].message.content or "{}", re.DOTALL)
            if m: self.hybrys = json.loads(m.group()); return self.hybrys
        except: pass
        return {"hybrys":0,"nivel":"ok","razon":"No calculado"}

    def save(self):
        try:
            self.db.execute("INSERT OR REPLACE INTO convs VALUES(?,?,?,?,datetime('now'),?)",(self.cid,self.msgs[0]["content"][:60] if self.msgs else "?",self.mode,self.depth,json.dumps(self.msgs,ensure_ascii=False)))
            self.db.commit()
        except: pass

    def load(self, cid: str) -> bool:
        r = self.db.execute("SELECT * FROM convs WHERE id=?",(cid,)).fetchone()
        if r: self.cid,_,self.mode,self.depth,_,self.msgs = r[0],r[1],r[2],r[3],r[4],json.loads(r[5]); return True
        return False

    def list(self): return self.db.execute("SELECT id,title,mode,depth,created_at FROM convs ORDER BY created_at DESC LIMIT 20").fetchall()
    def new(self): self.msgs=[]; self.cid=datetime.now().strftime("%Y%m%d%H%M"); self.last=""; self.hybrys=None


# ═══════════════════════════════════════════════════════════════
# INTERFAZ TERMINAL
# ═══════════════════════════════════════════════════════════════

BANNER = f"""
{C.G}╔════════════════════════════════════════════════╗
║  {C.W}◆ CATALYST CLI{C.G} — Terminal Agent               ║
║  {C.D}BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+{C.G}  ║
║  {C.D}💻 Tools · 📁 Repo auto-detect · /help{C.G}        ║
╚════════════════════════════════════════════════╝{C.R}"""

HELP = f"""
{C.W}COMANDOS:{C.R}
  {C.G}/mode{C.R} catalyst|pentetraktys|boo|zettelkasten|cobol
  {C.G}/depth{C.R} surface|medium|deep|frontier
  {C.G}/think{C.R} off|high|max
  {C.G}/research{C.R}       · /dialectic     · /game <juego> · /nogame
  {C.G}/hybrys{C.R}         · /onto          · /new          · /history
  {C.G}/tools{C.R} on|off   · /project [dir] · /save         · /load <id>
  {C.G}/list{C.R}           · /status        · /serve        · /threema
  {C.G}/clear{C.R}          · /help          · /exit
"""

def banner(): print(BANNER)

def status(eng: CatalystEngine):
    m = MODES[eng.mode]
    extras = ""
    if eng.research: extras += f" {C.Y}🔬{C.R}"
    if eng.dialectic: extras += f" {C.M}⚔{C.R}"
    if eng.game: extras += f" {C.B}[{eng.game}]{C.R}"
    if eng.tools_enabled:
        repo_name = Path(eng.project_root).name
        extras += f" {C.G}💻{C.R}"
    return f"{m[2]}{m[0]}{C.R} {m[1]} {C.D}|{C.R} {DEPTHS[eng.depth]} {C.D}|{C.R} {THINKS[eng.think]}{extras} {C.D}|{C.R} {eng.cid}"

async def handle_cmd(eng: CatalystEngine, line: str) -> bool:
    parts = line.split(); cmd = parts[0].lower(); args = parts[1:]

    if cmd in ("/exit","/quit","/q"): return False
    elif cmd == "/help": print(HELP)
    elif cmd == "/mode" and args:
        m = args[0].lower()
        if m in MODES: eng.mode = m; print(f"{C.G}Modo: {MODES[m][0]} {MODES[m][1]}{C.R}")
        else: print(f"{C.RD}Modos: {', '.join(MODES)}{C.R}")
    elif cmd == "/depth" and args:
        d = args[0].lower()
        if d in DEPTHS: eng.depth = d; print(f"{C.G}Profundidad: {DEPTHS[d]}{C.R}")
    elif cmd == "/think" and args:
        t = args[0].lower()
        if t in THINKS: eng.think = t; print(f"{C.G}Razonamiento: {THINKS[t]}{C.R}")
    elif cmd == "/research": eng.research = not eng.research; print(f"{C.G}Investigación: {'ON' if eng.research else 'OFF'}{C.R}")
    elif cmd == "/dialectic": eng.dialectic = not eng.dialectic; print(f"{C.G}Dialéctica: {'ON' if eng.dialectic else 'OFF'}{C.R}")
    elif cmd == "/game" and args:
        g = args[0].lower()
        if g in GAMES: eng.game = g; print(f"{C.G}Juego: {g} — {GAMES[g][:60]}{C.R}")
    elif cmd == "/nogame": eng.game = None; print(f"{C.G}Juego desactivado{C.R}")
    elif cmd == "/tools":
        if args:
            v = args[0].lower()
            if v in ("on", "true", "1", "yes"):
                eng.tools_enabled = True
                eng.executor = ToolExecutor(eng.project_root)
                print(f"{C.G}💻 Tools: ON — {eng.project_root}{C.R}")
            elif v in ("off", "false", "0", "no"):
                eng.tools_enabled = False
                print(f"{C.G}💻 Tools: OFF{C.R}")
            else:
                print(f"{C.Y}/tools on|off{C.R}")
        else:
            state = f"{C.G}ON{C.R}" if eng.tools_enabled else f"{C.RD}OFF{C.R}"
            print(f"💻 Tools: {state}  📁 Repo: {C.B}{eng.project_root}{C.R}")
    elif cmd == "/project":
        if args:
            p = Path(args[0]).expanduser().resolve()
            if p.exists():
                eng.project_root = str(p)
                eng.executor = ToolExecutor(eng.project_root)
                print(f"{C.G}📁 Repo: {eng.project_root}{C.R}")
            else:
                print(f"{C.RD}No existe: {args[0]}{C.R}")
        else:
            print(f"📁 Repo actual: {C.B}{eng.project_root}{C.R}")
            print(f"💻 Tools: {'ON' if eng.tools_enabled else 'OFF'}")
    elif cmd == "/onto":
        print(f"\n{C.W}ONTOLOGÍA{C.R}\n{C.D}10 categorías del ser. Modos Heidegger. Aletheia. Distingue lo que ES.{C.R}\n")
    elif cmd == "/hybrys":
        if eng.hybrys:
            h = eng.hybrys; hc = C.G if h.get("nivel")=="ok" else C.Y if h.get("nivel")=="warning" else C.RD
            print(f"\n{C.W}HYBRYS{C.R}  {hc}Δ {h.get('hybrys',0):.0%}{C.R} C:{h.get('confianza',0):.0%} V:{h.get('validacion',0):.0%} {C.D}{h.get('razon','')}{C.R}\n")
        else: print(f"{C.D}Envía un mensaje primero.{C.R}")
    elif cmd == "/new": eng.new(); print(f"{C.G}◆ Nueva conversación {eng.cid}{C.R}")
    elif cmd == "/history":
        for i,m in enumerate(eng.msgs):
            r = f"{C.G}Tú{C.R}" if m["role"]=="user" else f"{C.D}Cat{C.R}"
            print(f"  {C.D}{i}{C.R} {r}: {m['content'][:100].replace(chr(10),' ')}")
    elif cmd == "/save": eng.save(); print(f"{C.G}◆ Guardado: {eng.cid}{C.R}")
    elif cmd == "/load" and args:
        if eng.load(args[0]): print(f"{C.G}◆ Cargado: {args[0]} ({len(eng.msgs)} msgs){C.R}")
        else: print(f"{C.RD}No encontrado{C.R}")
    elif cmd == "/list":
        rows = eng.list()
        for r in rows: print(f"  {C.G}{r[0]}{C.R} {MODES.get(r[2],('?',''))[0]} {r[1][:40]:40s} {C.D}{r[2]}{C.R}")
        if not rows: print(f"{C.D}Vacío{C.R}")
    elif cmd == "/status":
        m = MODES[eng.mode]
        print(f"\n{C.W}CATALYST STATUS{C.R}\n  Modelo: {eng.model}\n  Modo: {m[0]} {m[1]}\n  Profundidad: {DEPTHS[eng.depth]}\n  Razonamiento: {THINKS[eng.think]}\n  Inv: {'ON' if eng.research else 'OFF'} | Dialéctica: {'ON' if eng.dialectic else 'OFF'} | Juego: {eng.game or '--'}\n  Conversación: {eng.cid} ({len(eng.msgs)} msgs)\n")
    elif cmd == "/clear" or cmd == "/cls": os.system('cls' if sys.platform=='win32' else 'clear'); banner()
    elif cmd == "/serve":
        try:
            from api_server import app; import uvicorn
            threading.Thread(target=lambda: uvicorn.run(app,host="0.0.0.0",port=8000,log_level="warning"),daemon=True).start()
            print(f"{C.G}◆ Servidor: http://localhost:8000{C.R}")
        except Exception as e: print(f"{C.Y}Error: {e}{C.R}")
    elif cmd == "/threema":
        try:
            from threema_web_bridge import ThreemaWebBridge
            threading.Thread(target=lambda: asyncio.run(ThreemaWebBridge().start()),daemon=True).start()
            print(f"{C.Y}◆ Threema Bridge iniciando... (requiere Playwright + Chromium){C.R}")
        except Exception as e: print(f"{C.Y}Error: {e}{C.R}")
    elif cmd.startswith("/"): print(f"{C.RD}?: {cmd}. Usa /help{C.R}")
    return True

async def process(eng: CatalystEngine, msg: str):
    print(f"\n{C.D}{'─'*50}{C.R}")
    t0 = time.time()
    eng.chat(msg, stream=True)
    elapsed = (time.time()-t0)*1000

    print(f"\n{C.D}{'─'*50}{C.R}")
    print(f"{C.D}[{elapsed:.0f}ms]{C.R}", end=" ")

    if eng.last and len(eng.last) > 20:
        h = await eng.check_hybrys(msg, eng.last)
        if h:
            hc = C.G if h.get("nivel")=="ok" else C.Y if h.get("nivel")=="warning" else C.RD
            print(f"{C.D}Δ{C.R} {hc}{h.get('hybrys',0):.0%}{C.R} {C.D}({h.get('nivel','?')}){C.R}")

    if eng.dialectic and eng.last and len(eng.last) > 50:
        print(f"\n{C.Y}⚔ ANTÍTESIS...{C.R}")
        eng.msgs.append({"role":"user","content":f"REFUTA: {eng.last[:2000]}"})
        anti = eng.chat("REFUTA esta respuesta como abogado del diablo. Encuentra supuestos débiles. 3 párrafos máximo. Español.", stream=True)
        if anti:
            print(f"\n{C.M}◆ SÍNTESIS...{C.R}")
            eng.msgs.append({"role":"user","content":f"SINTETIZA: TESIS:{eng.last[:1500]} ANTITESIS:{anti[:1000]}"})
            eng.chat("Sintetiza TESIS y ANTITESIS. Qué sobrevive. Termina con HYBRYS: bajo|medio|alto. Español.", stream=True)
    print()

async def interactive(eng: CatalystEngine):
    banner()
    while True:
        try:
            line = input(f"\n{status(eng)}{C.W} › {C.R}").strip()
        except (KeyboardInterrupt,EOFError):
            eng.save(); print(f"\n{C.G}◆ Guardado. BELL 13450.50{C.R}"); break
        if not line: continue
        if line.startswith("/"):
            if not await handle_cmd(eng, line): eng.save(); print(f"{C.G}◆ BELL 13450.50{C.R}"); break
            continue
        await process(eng, line)

async def one_shot(eng: CatalystEngine, msg: str):
    eng.chat(msg, stream=True); print()
    if eng.last: await eng.check_hybrys(msg, eng.last)
    if eng.hybrys:
        hc = C.G if eng.hybrys.get("nivel")=="ok" else C.Y if eng.hybrys.get("nivel")=="warning" else C.RD
        print(f"{C.D}Δ Hybrys: {hc}{eng.hybrys.get('hybrys',0):.0%}{C.R}")
    eng.save()

def parse_args():
    args = {"api_key":None,"mode":"catalyst","depth":"medium","think":"off","serve":False,
            "threema":False,"message":None,"project":None,"no_tools":False}
    i=1
    while i<len(sys.argv):
        a = sys.argv[i]
        if a=="--api-key" and i+1<len(sys.argv): i+=1; args["api_key"]=sys.argv[i]
        elif a=="--mode" and i+1<len(sys.argv): i+=1; args["mode"]=sys.argv[i] if sys.argv[i] in MODES else "catalyst"
        elif a=="--depth" and i+1<len(sys.argv): i+=1; args["depth"]=sys.argv[i] if sys.argv[i] in DEPTHS else "medium"
        elif a=="--think" and i+1<len(sys.argv): i+=1; args["think"]=sys.argv[i] if sys.argv[i] in THINKS else "off"
        elif a in ("--project", "-p") and i+1<len(sys.argv): i+=1; args["project"]=sys.argv[i]
        elif a in ("--no-tools",): args["no_tools"]=True
        elif a=="--serve": args["serve"]=True
        elif a=="--threema": args["threema"]=True
        elif a=="--no-color": C.off()
        elif a in ("-h","--help"): print(__doc__); sys.exit(0)
        elif not a.startswith("-"): args["message"]=a
        i+=1
    return args

async def main():
    args = parse_args()
    project_root = args.get("project") or detect_project_root()
    tools_enabled = not args.get("no_tools", False)
    eng = CatalystEngine(api_key=args["api_key"], project_root=project_root, tools_enabled=tools_enabled)
    eng.mode = args["mode"]; eng.depth = args["depth"]; eng.think = args["think"]
    if tools_enabled:
        print(f"{C.D}📁 Repo: {eng.project_root}  {'(auto-detectado)' if not args.get('project') else ''}{C.R}")

    if args["serve"]:
        try:
            from api_server import app; import uvicorn
            threading.Thread(target=lambda: uvicorn.run(app,host="0.0.0.0",port=8000,log_level="warning"),daemon=True).start()
            print(f"{C.G}◆ Servidor: http://localhost:8000{C.R}")
        except: pass

    if args["threema"]:
        try:
            from threema_web_bridge import ThreemaWebBridge
            threading.Thread(target=lambda: asyncio.run(ThreemaWebBridge().start()),daemon=True).start()
        except: pass

    if args["message"]:
        await one_shot(eng, args["message"])
    else:
        await interactive(eng)

if __name__ == "__main__":
    asyncio.run(main())
