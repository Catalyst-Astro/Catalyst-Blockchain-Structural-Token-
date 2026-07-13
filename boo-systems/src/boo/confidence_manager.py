#!/usr/bin/env python3
"""
Boo Confidence Manager — Dynamic Trust Calibration (#029)
═══════════════════════════════════════════════════════════════
BELL 13450.50 | Adjusts system confidence based on simulation results,
reward history, and time decay. Prevents Hybrys by design.
"""

import numpy as np
from math import exp
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple


@dataclass
class ConfidenceState:
    """Dynamic confidence tracking."""
    current: float = 7.0          # 0-10 scale
    base: float = 5.0             # Baseline (neutral)
    success_streak: int = 0
    failure_streak: int = 0
    total_successes: int = 0
    total_failures: int = 0
    last_update: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    history: List[Dict] = field(default_factory=list)

    @property
    def success_rate(self) -> float:
        total = self.total_successes + self.total_failures
        return self.total_successes / total if total > 0 else 0.5

    @property
    def is_at_hybrys_risk(self) -> bool:
        """Confidence > 8 AND success rate < 0.5 = HYBRYS RISK"""
        return self.current > 8.0 and self.success_rate < 0.5

    @property
    def normalized(self) -> float:
        """Normalize to 0-1 scale."""
        return self.current / 10.0


class ConfidenceManager:
    """Manages dynamic confidence calibration."""

    def __init__(self, initial_confidence: float = 7.0, decay_rate: float = 0.01):
        self.state = ConfidenceState(current=initial_confidence)
        self.decay_rate = decay_rate  # Per hour
        self.boost_factor = 0.3       # Per success
        self.penalty_factor = 0.5     # Per failure
        self.streak_multiplier = 1.5  # Bonus for consecutive successes

    def record_success(self, details: str = "") -> Dict:
        """Record a successful simulation or validation."""
        self.state.total_successes += 1
        self.state.success_streak += 1
        self.state.failure_streak = 0

        # Boost confidence — diminishing returns at high confidence
        boost = self.boost_factor
        if self.state.success_streak > 3:
            boost *= self.streak_multiplier
        # Reduce boost as confidence approaches 10
        boost *= (10 - self.state.current) / 10

        self.state.current = min(10.0, self.state.current + boost)
        self.state.last_update = datetime.now(timezone.utc)

        entry = {
            "type": "success", "detail": details,
            "confidence": self.state.current, "streak": self.state.success_streak,
            "timestamp": self.state.last_update.isoformat(),
        }
        self.state.history.append(entry)
        return entry

    def record_failure(self, details: str = "") -> Dict:
        """Record a simulation or validation failure."""
        self.state.total_failures += 1
        self.state.failure_streak += 1
        self.state.success_streak = 0

        penalty = self.penalty_factor
        if self.state.failure_streak > 2:
            penalty *= 2  # Accelerated penalty for repeated failures

        self.state.current = max(1.0, self.state.current - penalty)
        self.state.last_update = datetime.now(timezone.utc)

        entry = {
            "type": "failure", "detail": details,
            "confidence": self.state.current, "streak": self.state.failure_streak,
            "timestamp": self.state.last_update.isoformat(),
        }
        self.state.history.append(entry)
        return entry

    def apply_time_decay(self) -> float:
        """Confidence decays over time without new evidence."""
        now = datetime.now(timezone.utc)
        hours_elapsed = (now - self.state.last_update).total_seconds() / 3600
        if hours_elapsed > 1:
            decay = self.decay_rate * hours_elapsed
            self.state.current = max(self.state.base, self.state.current - decay)
            self.state.last_update = now
        return self.state.current

    def reset_on_hybrys(self) -> Dict:
        """Aggressive confidence reduction after Hybrys detection."""
        old = self.state.current
        self.state.current = max(2.0, self.state.base - 2.0)
        self.state.success_streak = 0
        self.state.failure_streak = 0
        return {
            "confidence_before": old,
            "confidence_after": self.state.current,
            "reduction": old - self.state.current,
            "action": "HYBRYS_RESET",
        }

    def get_recommendation(self) -> Dict:
        """Get a recommendation based on current confidence state."""
        self.apply_time_decay()
        c = self.state.current

        if c > 9.0:
            rec = "CAUTION: Extremely high confidence. Validate with external data before acting."
        elif c > 8.0:
            rec = "High confidence. Consider antithesis search before proceeding."
        elif c > 6.0:
            rec = "Moderate confidence. Proceed with standard validation."
        elif c > 4.0:
            rec = "Low confidence. Run additional simulations."
        else:
            rec = "Very low confidence. Consider resetting thesis."

        return {
            "confidence": c,
            "normalized": self.state.normalized,
            "success_rate": self.state.success_rate,
            "recommendation": rec,
            "hybrys_risk": self.state.is_at_hybrys_risk,
        }

    def stats(self) -> Dict:
        """Full statistics."""
        return {
            "confidence": self.state.current,
            "base": self.state.base,
            "successes": self.state.total_successes,
            "failures": self.state.total_failures,
            "success_rate": self.state.success_rate,
            "streak": self.state.success_streak - self.state.failure_streak,
            "hybrys_risk": self.state.is_at_hybrys_risk,
            "history_len": len(self.state.history),
        }
