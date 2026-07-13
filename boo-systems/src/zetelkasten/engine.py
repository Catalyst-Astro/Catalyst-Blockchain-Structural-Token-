"""
Zettelkasten Dialectical Engine — Pentetraktys 5-Phase State Machine
═══════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

The core cognitive engine that drives the dialectical process:
  TESIS → ANTITESIS → SINTESIS → CONCLUSION → HYBRYS → RESET

Each cycle is a "block" in the blockchain of knowledge.
"""

import hashlib, json, time, os
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum

from ..core.constants import PentetraktysPhase, CognitivePillar, HYBRYS_TRIGGER, HYBRYS_CRITICAL
from ..core.exceptions import HybrisTriggered, InvalidPhaseTransition


@dataclass
class ZettelBlock:
    """A single dialectical cycle — one 'block' in the knowledge chain."""
    block_id: str
    phase: str
    thesis: Optional[str] = None
    antithesis: Optional[str] = None
    synthesis: Optional[str] = None
    conclusion: Optional[str] = None
    forward_action: Optional[str] = None
    reward_score: Optional[float] = None
    confidence: float = 7.0
    hybrys_score: float = 0.0
    hybrys_triggered: bool = False
    pillars: Dict[str, Any] = field(default_factory=lambda: {
        "td_cardinal": None,
        "bu_ordinal": None,
        "forward_action": None,
        "reward_score": None,
    })
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    parent_block_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    seal: str = ""

    def compute_seal(self) -> str:
        """SHA-256 seal — makes the block immutable."""
        data = json.dumps({
            "block_id": self.block_id,
            "phase": self.phase,
            "thesis": self.thesis,
            "antithesis": self.antithesis,
            "synthesis": self.synthesis,
            "conclusion": self.conclusion,
            "timestamp": self.timestamp,
            "parent_block_id": self.parent_block_id,
        }, sort_keys=True, default=str)
        self.seal = hashlib.sha256(data.encode()).hexdigest()
        return self.seal


class DialecticalEngine:
    """Pentetraktys 5-phase state machine."""

    def __init__(self, config: Optional[Dict] = None):
        self.phase = PentetraktysPhase.THESIS
        self.config = config or {}
        self.blocks: List[ZettelBlock] = []
        self.current_block: Optional[ZettelBlock] = None
        self.confidence = 7.0
        self.reward_score = 0.0
        self.hybris_score = 0.0
        self.block_counter = 0

    # ── Phase Transitions ──

    def _valid_transition(self, from_phase: PentetraktysPhase, to_phase: PentetraktysPhase) -> bool:
        """Validate phase transition according to Pentetraktys rules."""
        valid = {
            PentetraktysPhase.THESIS: [PentetraktysPhase.ANTITHESIS, PentetraktysPhase.HYBRYS],
            PentetraktysPhase.ANTITHESIS: [PentetraktysPhase.SYNTHESIS, PentetraktysPhase.HYBRYS],
            PentetraktysPhase.SYNTHESIS: [PentetraktysPhase.CONCLUSION, PentetraktysPhase.HYBRYS],
            PentetraktysPhase.CONCLUSION: [PentetraktysPhase.THESIS, PentetraktysPhase.HYBRYS],
            PentetraktysPhase.HYBRYS: [PentetraktysPhase.THESIS],  # Reset → new thesis
            PentetraktysPhase.RESET: [PentetraktysPhase.THESIS],
        }
        return to_phase in valid.get(from_phase, [])

    def transit(self, to_phase: PentetraktysPhase) -> bool:
        """Transition to a new phase. Returns True if valid."""
        if not self._valid_transition(self.phase, to_phase):
            raise InvalidPhaseTransition(
                f"Cannot transition from {self.phase.value} to {to_phase.value}"
            )
        self.phase = to_phase
        return True

    # ── Block Creation ──

    def new_block(self) -> ZettelBlock:
        """Start a new dialectical cycle block."""
        self.block_counter += 1
        block_id = f"BLOCK-{self.block_counter:04d}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        parent_id = self.current_block.block_id if self.current_block else None

        self.current_block = ZettelBlock(
            block_id=block_id,
            phase=self.phase.value,
            parent_block_id=parent_id,
        )
        return self.current_block

    # ── Input Processing ──

    def process_thesis(self, thesis_text: str) -> ZettelBlock:
        """Process a THESIS input. Starts or continues a cycle."""
        if self.phase == PentetraktysPhase.RESET or self.phase == PentetraktysPhase.HYBRYS:
            self.phase = PentetraktysPhase.THESIS

        block = self.new_block()
        block.thesis = thesis_text
        block.pillars["td_cardinal"] = thesis_text
        self.phase = PentetraktysPhase.THESIS
        return block

    def process_antithesis(self, antithesis_text: str) -> ZettelBlock:
        """Process an ANTITHESIS — the counter-argument."""
        if self.phase not in [PentetraktysPhase.THESIS]:
            if self.current_block:
                self.current_block.antithesis = antithesis_text
                self.current_block.pillars["bu_ordinal"] = antithesis_text
                self.phase = PentetraktysPhase.ANTITHESIS
                return self.current_block

        block = self.new_block()
        block.antithesis = antithesis_text
        block.pillars["bu_ordinal"] = antithesis_text
        self.phase = PentetraktysPhase.ANTITHESIS
        return block

    def process_synthesis(self, synthesis_text: str = None) -> ZettelBlock:
        """Generate or accept a SYNTHESIS — merging thesis and antithesis."""
        if not synthesis_text:
            # Auto-generate synthesis from current thesis + antithesis
            t = self.current_block.thesis if self.current_block else ""
            a = self.current_block.antithesis if self.current_block else ""
            synthesis_text = f"SYNTHESIS: Integrating '{t[:60]}...' with '{a[:60]}...'"

        if self.current_block:
            self.current_block.synthesis = synthesis_text
        self.phase = PentetraktysPhase.SYNTHESIS
        return self.current_block

    def process_conclusion(self, conclusion_text: str, action: str = None) -> ZettelBlock:
        """Process a CONCLUSION — the actionable insight."""
        if self.current_block:
            self.current_block.conclusion = conclusion_text
            self.current_block.forward_action = action or conclusion_text
            self.current_block.pillars["forward_action"] = self.current_block.forward_action
        self.phase = PentetraktysPhase.CONCLUSION
        return self.current_block

    def process_reward(self, score: float, confidence: float = None) -> Dict:
        """Process a REWARD evaluation. This is where Hybrys detection happens."""
        if self.current_block:
            self.current_block.reward_score = score
            self.current_block.pillars["reward_score"] = score

        if confidence is not None:
            self.confidence = confidence
            if self.current_block:
                self.current_block.confidence = confidence

        self.reward_score = score

        # Hybrys Detection — The Golden Rule
        hybrys_ratio = (self.confidence * (1 - score)) / 10
        self.hybris_score = hybrys_ratio

        if self.current_block:
            self.current_block.hybris_score = round(hybrys_ratio, 4)

        triggered = False
        if hybrys_ratio > HYBRYS_CRITICAL:
            triggered = True
            self.phase = PentetraktysPhase.HYBRYS
            if self.current_block:
                self.current_block.hybrys_triggered = True
            raise HybrisTriggered(self.confidence, score, HYBRYS_CRITICAL)
        elif hybrys_ratio > HYBRYS_TRIGGER:
            triggered = True
            if self.current_block:
                self.current_block.hybrys_triggered = True

        return {
            "hybrys_score": round(hybrys_ratio, 4),
            "hybrys_triggered": triggered,
            "status": "CRITICAL" if triggered and hybrys_ratio > HYBRYS_CRITICAL else
                      "WARNING" if triggered else "CLEAN",
            "phase": self.phase.value,
        }

    def process_reset(self, lesson_learned: str) -> ZettelBlock:
        """RESET — learn from Hybrys and start a new thesis."""
        self.phase = PentetraktysPhase.RESET

        # Seal the old block
        if self.current_block:
            self.current_block.compute_seal()
            self.blocks.append(self.current_block)

        # Start fresh with the lesson as the new thesis
        self.confidence = 5.0  # Reset confidence
        self.hybris_score = 0.0
        block = self.process_thesis(f"RESET LESSON: {lesson_learned}")
        self.phase = PentetraktysPhase.THESIS
        return block

    # ── State ──

    def get_state(self) -> Dict:
        """Get current engine state."""
        return {
            "phase": self.phase.value,
            "confidence": self.confidence,
            "reward_score": self.reward_score,
            "hybrys_score": round(self.hybris_score, 4),
            "block_counter": self.block_counter,
            "current_block_id": self.current_block.block_id if self.current_block else None,
            "total_blocks": len(self.blocks),
            "active_pillars": self.current_block.pillars if self.current_block else {},
        }

    def seal_current_block(self) -> str:
        """Seal the current block and store it."""
        if self.current_block:
            seal = self.current_block.compute_seal()
            self.blocks.append(self.current_block)
            return seal
        return ""
