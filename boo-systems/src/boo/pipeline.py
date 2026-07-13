#!/usr/bin/env python3
"""
Boo Validation Pipeline — End-to-end Synthesis Validation (#028)
══════════════════════════════════════════════════════════════════
BELL 13450.50 | Full pipeline: Zettelkasten synthesis → Boo params →
simulation → validation → confidence update → notification.
"""

import hashlib, json, time
from datetime import datetime, timezone
from typing import Dict, Optional, Any
from dataclasses import dataclass

from .orchestrator import BooOrchestrator
from .confidence_manager import ConfidenceManager
from .experiment_tracker import ExperimentTracker
from .notifications import NotificationSystem, NotificationLevel


@dataclass
class PipelineResult:
    """Complete result of a validation pipeline run."""
    synthesis: str
    params: Dict
    simulation: Dict
    validated: bool
    confidence_update: Dict
    notification_sent: bool
    experiment_id: str
    action: str  # "advance_to_conclusion" | "generate_antithesis" | "retry"
    auto_antithesis: str = ""
    seal: str = ""


class ValidationPipeline:
    """
    Complete synthesis validation pipeline.

    Flow:
      1. Receive synthesis from Zettelkasten
      2. Translate to Boo parameters
      3. Run simulation
      4. Compare results with expectations
      5. Update confidence
      6. Notify user
      7. Return decision (advance / antithesis / retry)
    """

    def __init__(self):
        self.orchestrator = BooOrchestrator()
        self.confidence = ConfidenceManager(initial_confidence=7.0)
        self.tracker = ExperimentTracker()
        self.notifier = NotificationSystem()
        self.history: list = []

    def validate(self, synthesis: str, engine_state: Dict = None) -> PipelineResult:
        """
        Run the full validation pipeline on a synthesis.

        Returns PipelineResult with decision on whether to advance or generate antithesis.
        """
        # Step 1: Translate synthesis → Boo parameters
        params = self.orchestrator.translate_to_params(synthesis)

        # Step 2: Start experiment
        exp = self.tracker.start(synthesis, params, self.confidence.state.current)

        # Step 3: Run simulation
        sim_result = self.orchestrator.simulate(params)
        self.tracker.log_result(exp.experiment_id, sim_result)

        # Step 4: Check autopoietic integrity
        integrity = sim_result.get("autopoietic_integrity", 0)
        threshold = 0.5
        validated = integrity >= threshold

        # Step 5: Update confidence
        if validated:
            conf_update = self.confidence.record_success(
                f"Synthesis validated: integrity={integrity:.2%}"
            )
        else:
            conf_update = self.confidence.record_failure(
                f"Synthesis rejected: integrity={integrity:.2%} < {threshold:.0%}"
            )

        # Step 6: Determine action
        if validated:
            action = "advance_to_conclusion"
            auto_antithesis = ""
            self.notifier.notify(
                NotificationLevel.SUCCESS,
                "SYNTHESIS VALIDATED",
                f"Autopoietic integrity {integrity:.2%} >= {threshold:.0%}. Advancing.",
                context=sim_result,
                action="Use !forward to execute the conclusion."
            )
        else:
            action = "generate_antithesis"
            auto_antithesis = (
                f"AUTO-ANTITHESIS (Boo Validator #{self.orchestrator.counter}): "
                f"Simulation rejected synthesis. Autopoietic integrity {integrity:.2%} "
                f"below threshold {threshold:.0%}. Domain: {sim_result.get('domain', 'unknown')}. "
                f"Recommendation: adjust energy parameters or increase cell count."
            )
            self.notifier.notify_validation_failure(synthesis, sim_result)

        # Step 7: Seal
        result = PipelineResult(
            synthesis=synthesis[:100],
            params=params,
            simulation=sim_result,
            validated=validated,
            confidence_update=conf_update,
            notification_sent=True,
            experiment_id=exp.experiment_id,
            action=action,
            auto_antithesis=auto_antithesis,
            seal=hashlib.sha256(
                f"{exp.experiment_id}{validated}{conf_update['confidence']}".encode()
            ).hexdigest()[:16],
        )

        self.history.append(result)
        self.tracker.log_reward(exp.experiment_id, 8.0 if validated else 3.0)

        return result

    def pipeline_stats(self) -> Dict:
        """Statistics on pipeline performance."""
        if not self.history:
            return {"runs": 0}
        validated = sum(1 for r in self.history if r.validated)
        return {
            "runs": len(self.history),
            "validated": validated,
            "rejected": len(self.history) - validated,
            "validation_rate": validated / len(self.history),
            "confidence": self.confidence.stats(),
            "experiments": self.tracker.stats(),
            "notifications": self.notifier.summary(),
        }

    def inject_antithesis_to_engine(self, synthesis: str, sim_result: Dict) -> str:
        """Generate an antithesis from simulation failure and inject into Zettelkasten."""
        integrity = sim_result.get("autopoietic_integrity", 0)
        domain = sim_result.get("domain", "unknown")
        return (
            f"AUTOMATIC ANTITHESIS (Boo Simulator #{self.orchestrator.counter}): "
            f"Simulation rejected the synthesis. Autopoietic integrity {integrity:.2%} "
            f"is below threshold. Domain: {domain}. "
            f"The proposed parameters are not viable. Adjust and retry."
        )
