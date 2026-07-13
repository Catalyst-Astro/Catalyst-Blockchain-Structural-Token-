"""
Zettelkasten Validators — Hybrys Detection & Input Validation
═══════════════════════════════════════════════════════════════
BELL 13450.50 | The Golden Rule: confidence > 0.8 AND reward < 0.4 = HYBRYS
"""

from typing import Dict, Tuple
from ..core.constants import HYBRYS_CONFIDENCE_HIGH, HYBRYS_REWARD_LOW, HYBRYS_TRIGGER, HYBRYS_CRITICAL


class HybrysDetector:
    """Detects Hybrys states and triggers dialectical resets."""

    def __init__(self, confidence_high: float = HYBRYS_CONFIDENCE_HIGH,
                 reward_low: float = HYBRYS_REWARD_LOW):
        self.confidence_high = confidence_high
        self.reward_low = reward_low

    def check(self, confidence: float, reward: float) -> Dict:
        """
        Golden Rule: If confidence > 0.8 AND reward < 0.4, Hybrys is triggered.
        Returns status, score, and whether reset is required.
        """
        # Normalize inputs
        conf = max(0.0, min(1.0, confidence / 10.0))  # 0-10 scale → 0-1
        rew = max(0.0, min(1.0, reward / 10.0))

        # Hybrys score: high confidence with low reward = dangerous certainty
        hybrys_score = (conf * (1 - rew))

        status = "CLEAN"
        reset_required = False

        if hybrys_score > HYBRYS_CRITICAL:
            status = "CRITICAL"
            reset_required = True
        elif hybrys_score > HYBRYS_TRIGGER:
            status = "WARNING"
        elif conf > self.confidence_high and rew < self.reward_low:
            status = "WARNING"

        return {
            "hybrys_score": round(hybrys_score, 4),
            "status": status,
            "reset_required": reset_required,
            "confidence_raw": confidence,
            "confidence_normalized": round(conf, 4),
            "reward_raw": reward,
            "reward_normalized": round(rew, 4),
            "golden_rule_violated": conf > self.confidence_high and rew < self.reward_low,
        }

    def should_reset(self, confidence: float, reward: float) -> Tuple[bool, str]:
        """Quick check: should the system reset? Returns (should_reset, reason)."""
        result = self.check(confidence, reward)
        if result["reset_required"]:
            return True, f"CRITICAL Hybrys ({result['hybrys_score']:.2%}) — forced reset required"
        if result["golden_rule_violated"]:
            return False, f"WARNING: Hybrys detected ({result['hybrys_score']:.2%}) — consider reset"
        return False, "CLEAN"


class InputValidator:
    """Validates user input before processing."""

    @staticmethod
    def classify(input_text: str) -> str:
        """
        Classify input as: 'command', 'thesis', 'antithesis', 'question', or 'action'.
        Uses simple keyword detection.
        """
        text = input_text.strip().lower()

        # Commands with !
        if text.startswith("!"):
            cmd = text.split()[0][1:]
            valid_commands = ["tesis", "contra", "sintetiza", "forward", "reward", "reset", "state"]
            if cmd in valid_commands:
                return "command"
            return "unknown_command"

        # Thesis markers
        thesis_markers = ["tesis:", "afirmo:", "propongo:", "hipótesis:", "creo que", "la regla es"]
        if any(text.startswith(m) for m in thesis_markers):
            return "thesis"

        # Antithesis markers
        anti_markers = ["contra:", "pero", "sin embargo", "objecion:", "antítesis:", "no estoy de acuerdo"]
        if any(m in text for m in anti_markers):
            return "antithesis"

        # Questions
        if text.endswith("?") or text.startswith(("qué", "como", "por qué", "cuál", "cuando", "donde")):
            return "question"

        # Default: treat as general input
        return "general"

    @staticmethod
    def sanitize(text: str) -> str:
        """Remove special characters, limit length."""
        allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑ.,;:!?¿¡-—()[]{}'\"@#$%&/=+*")
        cleaned = ''.join(c for c in text if c in allowed)
        return cleaned[:10000]  # Max 10k chars
