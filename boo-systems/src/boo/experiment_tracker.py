#!/usr/bin/env python3
"""
Boo Experiment Tracker — Full Experiment Lifecycle (#030)
═══════════════════════════════════════════════════════════
BELL 13450.50 | Records every simulation, synthesis validation,
and reward cycle for complete traceability.
"""

import hashlib, json, time, os
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from pathlib import Path


@dataclass
class Experiment:
    """A single experiment run."""
    experiment_id: str
    synthesis: str
    params: Dict
    results: Optional[Dict] = None
    reward: Optional[float] = None
    confidence: float = 7.0
    status: str = "PENDING"  # PENDING, RUNNING, COMPLETED, FAILED, VALIDATED
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    duration_s: float = 0.0
    error_message: str = ""
    seal: str = ""

    def compute_seal(self) -> str:
        data = json.dumps({
            "id": self.experiment_id, "synthesis": self.synthesis,
            "params": self.params, "results": self.results,
            "reward": self.reward, "timestamp": self.timestamp,
        }, sort_keys=True, default=str)
        self.seal = hashlib.sha256(data.encode()).hexdigest()
        return self.seal

    def to_dict(self) -> Dict:
        return {
            "id": self.experiment_id, "synthesis": self.synthesis[:100],
            "params": self.params, "results": self.results,
            "reward": self.reward, "confidence": self.confidence,
            "status": self.status, "timestamp": self.timestamp,
            "seal": self.seal,
        }


class ExperimentTracker:
    """Tracks all experiments: start, log, reward, export."""

    def __init__(self, storage_dir: str = None):
        if storage_dir is None:
            storage_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "data", "experiments"
            )
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.experiments: List[Experiment] = []
        self.counter = 0

    def start(self, synthesis: str, params: Dict, confidence: float = 7.0) -> Experiment:
        """Start a new experiment."""
        self.counter += 1
        exp_id = f"EXP-{self.counter:04d}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        exp = Experiment(
            experiment_id=exp_id,
            synthesis=synthesis,
            params=params,
            confidence=confidence,
            status="RUNNING",
        )
        self.experiments.append(exp)
        return exp

    def log_result(self, experiment_id: str, results: Dict, duration_s: float = 0.0) -> Experiment:
        """Log simulation results for an experiment."""
        for exp in self.experiments:
            if exp.experiment_id == experiment_id:
                exp.results = results
                exp.status = "COMPLETED" if not results.get("error") else "FAILED"
                exp.duration_s = duration_s
                exp.compute_seal()
                self._save(exp)
                return exp
        raise ValueError(f"Experiment {experiment_id} not found")

    def log_reward(self, experiment_id: str, reward: float) -> Experiment:
        """Record user reward for an experiment."""
        for exp in self.experiments:
            if exp.experiment_id == experiment_id:
                exp.reward = reward
                exp.status = "VALIDATED" if reward >= 5 else "FAILED"
                exp.compute_seal()
                self._save(exp)
                return exp
        raise ValueError(f"Experiment {experiment_id} not found")

    def _save(self, exp: Experiment):
        """Save experiment to disk."""
        filepath = self.storage_dir / f"{exp.experiment_id}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(exp.to_dict(), f, indent=2, ensure_ascii=False, default=str)

    def load(self, experiment_id: str) -> Optional[Dict]:
        """Load an experiment from disk."""
        filepath = self.storage_dir / f"{experiment_id}.json"
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def list_all(self, limit: int = 50) -> List[Dict]:
        """List recent experiments."""
        files = sorted(self.storage_dir.glob("EXP-*.json"), reverse=True)[:limit]
        return [json.load(open(f, "r", encoding="utf-8")) for f in files]

    def stats(self) -> Dict:
        """Summary statistics."""
        total = len(self.experiments)
        if total == 0:
            return {"total": 0}
        completed = sum(1 for e in self.experiments if e.status == "COMPLETED")
        validated = sum(1 for e in self.experiments if e.status == "VALIDATED")
        failed = sum(1 for e in self.experiments if e.status == "FAILED")
        rewards = [e.reward for e in self.experiments if e.reward is not None]
        return {
            "total": total, "completed": completed, "validated": validated,
            "failed": failed, "avg_reward": sum(rewards) / len(rewards) if rewards else 0,
            "success_rate": (completed + validated) / total if total > 0 else 0,
        }

    def export_batch(self, status: str = None) -> str:
        """Export experiments as JSON batch."""
        exps = self.experiments
        if status:
            exps = [e for e in exps if e.status == status]
        filepath = self.storage_dir / f"export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump([e.to_dict() for e in exps], f, indent=2, ensure_ascii=False, default=str)
        return str(filepath)
