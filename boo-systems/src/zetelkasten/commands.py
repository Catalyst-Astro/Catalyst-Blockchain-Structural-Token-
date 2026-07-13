"""
Zettelkasten Commands — Interactive CLI Parser
═══════════════════════════════════════════════
BELL 13450.50 | Command prefix: !

Available commands:
  !tesis <texto>        — Submit a thesis (P1: Top-Down)
  !contra <texto>       — Submit an antithesis (P2: Bottom-Up)
  !sintetiza [texto]    — Generate/accept synthesis (P3)
  !forward <acción>     — Declare forward action (P4)
  !reward <0-10>        — Evaluate with reward score (triggers Hybrys check)
  !reset <lección>      — Force reset after Hybrys
  !state                — Show current engine state
  !chain                — Show block chain
  !help                 — Show this help
"""

from typing import Dict, Optional, Tuple
from .engine import DialecticalEngine, ZettelBlock
from .memory import BlockMemory
from ..core.constants import PentetraktysPhase


class CommandParser:
    """Parses and executes ! commands for the Zettelkasten engine."""

    def __init__(self, engine: DialecticalEngine, memory: BlockMemory):
        self.engine = engine
        self.memory = memory

    def parse(self, input_text: str) -> Dict:
        """
        Parse user input. Returns a result dict with action, data, and message.
        """
        text = input_text.strip()

        # Natural language classification (no ! prefix)
        if not text.startswith("!"):
            return self._handle_natural(text)

        # Command mode
        parts = text[1:].split(maxsplit=1)
        cmd = parts[0].lower()
        arg = parts[1] if len(parts) > 1 else ""

        handlers = {
            "tesis": self._cmd_tesis,
            "contra": self._cmd_contra,
            "sintetiza": self._cmd_sintetiza,
            "forward": self._cmd_forward,
            "reward": self._cmd_reward,
            "reset": self._cmd_reset,
            "state": self._cmd_state,
            "chain": self._cmd_chain,
            "help": self._cmd_help,
        }

        handler = handlers.get(cmd, self._cmd_unknown)
        return handler(arg)

    # ── Command Handlers ──

    def _cmd_tesis(self, arg: str) -> Dict:
        if not arg:
            return {"ok": False, "msg": "Usage: !tesis <texto de la tesis>"}
        block = self.engine.process_thesis(arg)
        self.memory.save_block(block)
        return {
            "ok": True, "action": "thesis", "block_id": block.block_id,
            "phase": self.engine.phase.value,
            "msg": f"✅ TESIS registrada ({block.block_id}). Fase: {self.engine.phase.value}",
        }

    def _cmd_contra(self, arg: str) -> Dict:
        if not arg:
            return {"ok": False, "msg": "Usage: !contra <texto de la antítesis>"}
        block = self.engine.process_antithesis(arg)
        self.memory.save_block(block)
        return {
            "ok": True, "action": "antithesis", "block_id": block.block_id,
            "phase": self.engine.phase.value,
            "msg": f"⚡ ANTÍTESIS registrada. Fase: {self.engine.phase.value}",
        }

    def _cmd_sintetiza(self, arg: str) -> Dict:
        block = self.engine.process_synthesis(arg if arg else None)
        self.memory.save_block(block)
        return {
            "ok": True, "action": "synthesis", "block_id": block.block_id,
            "phase": self.engine.phase.value,
            "synthesis": block.synthesis,
            "msg": f"🧬 SÍNTESIS generada. Fase: {self.engine.phase.value}",
        }

    def _cmd_forward(self, arg: str) -> Dict:
        if not arg:
            return {"ok": False, "msg": "Usage: !forward <acción a ejecutar>"}
        block = self.engine.process_conclusion(arg, arg)
        self.memory.save_block(block)
        return {
            "ok": True, "action": "forward", "block_id": block.block_id,
            "phase": self.engine.phase.value,
            "msg": f"➡️ FORWARD: '{arg[:60]}...' | Fase: {self.engine.phase.value}",
        }

    def _cmd_reward(self, arg: str) -> Dict:
        try:
            score = float(arg)
            if score < 0 or score > 10:
                return {"ok": False, "msg": "Reward debe estar entre 0 y 10"}
        except ValueError:
            return {"ok": False, "msg": "Usage: !reward <0-10>"}

        try:
            result = self.engine.process_reward(score)
            self.memory.save_block(self.engine.current_block)
            return {
                "ok": True, "action": "reward",
                "hybrys": result,
                "phase": self.engine.phase.value,
                "msg": f"🏆 Reward: {score}/10 | Hybrys: {result['hybrys_score']:.2%} | {result['status']}",
            }
        except Exception as e:
            return {
                "ok": False, "action": "hybrys_triggered",
                "error": str(e),
                "msg": f"🚨 HYBRYS TRIGGERED: {str(e)}. Use !reset para reiniciar.",
            }

    def _cmd_reset(self, arg: str) -> Dict:
        lesson = arg if arg else "Lección aprendida del ciclo Hybrys"
        block = self.engine.process_reset(lesson)
        self.memory.save_block(block)
        return {
            "ok": True, "action": "reset", "block_id": block.block_id,
            "phase": self.engine.phase.value,
            "msg": f"🔄 RESET completado. Nueva TESIS desde: '{lesson[:60]}...'",
        }

    def _cmd_state(self, arg: str) -> Dict:
        state = self.engine.get_state()
        return {"ok": True, "action": "state", "state": state,
                "msg": f"Fase: {state['phase']} | Bloques: {state['total_blocks']} | Hybrys: {state['hybrys_score']:.2%}"}

    def _cmd_chain(self, arg: str) -> Dict:
        limit = int(arg) if arg.isdigit() else 10
        chain = self.memory.get_chain(limit)
        return {"ok": True, "action": "chain", "chain": chain,
                "msg": f"📜 Últimos {len(chain)} bloques"}

    def _cmd_help(self, arg: str) -> Dict:
        return {"ok": True, "action": "help", "msg": """
╔══════════════════════════════════════════════════════════════╗
║  COMANDOS ZETTELKASTEN — PENTETRAKTYS 4D                    ║
╠══════════════════════════════════════════════════════════════╣
║  !tesis <texto>       P1: Top-Down — reglas, anclas        ║
║  !contra <texto>      P2: Bottom-Up — evidencia, datos     ║
║  !sintetiza [texto]   P3: Síntesis — integración           ║
║  !forward <acción>    P4: Forward — acción ejecutable      ║
║  !reward <0-10>       Evalúa el ciclo (detecta Hybrys)     ║
║  !reset <lección>     Reinicia desde la lección aprendida  ║
║  !state               Muestra estado actual                ║
║  !chain [n]           Muestra últimos n bloques            ║
║  !help                Este mensaje                         ║
╚══════════════════════════════════════════════════════════════╝
""".strip()}

    def _cmd_unknown(self, arg: str) -> Dict:
        return {"ok": False, "msg": "Comando desconocido. Usa !help para ver los comandos."}

    # ── Natural Language Handler ──

    def _handle_natural(self, text: str) -> Dict:
        """Route natural language input to the appropriate phase."""
        phase = self.engine.phase

        if phase == PentetraktysPhase.THESIS:
            return self._cmd_contra(text)
        elif phase == PentetraktysPhase.ANTITHESIS:
            return self._cmd_sintetiza(text)
        elif phase == PentetraktysPhase.SYNTHESIS:
            return self._cmd_forward(text)
        elif phase == PentetraktysPhase.CONCLUSION:
            try:
                score = float(text)
                return self._cmd_reward(str(score))
            except ValueError:
                return self._cmd_tesis(text)
        elif phase == PentetraktysPhase.HYBRYS:
            return self._cmd_reset(text)
        else:
            return self._cmd_tesis(text)
