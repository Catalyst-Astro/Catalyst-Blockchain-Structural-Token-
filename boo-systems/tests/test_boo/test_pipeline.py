"""Test Boo Pipeline — Fase 3 Integration (#026-#031)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest
from src.boo.confidence_manager import ConfidenceManager, ConfidenceState
from src.boo.experiment_tracker import ExperimentTracker, Experiment
from src.boo.notifications import NotificationSystem, NotificationLevel, Notification
from src.boo.pipeline import ValidationPipeline, PipelineResult


class TestConfidenceManager:
    def test_initial_state(self):
        cm = ConfidenceManager(initial_confidence=7.0)
        assert cm.state.current == 7.0

    def test_success_boosts(self):
        cm = ConfidenceManager(initial_confidence=5.0)
        cm.record_success("test")
        assert cm.state.current > 5.0

    def test_failure_penalizes(self):
        cm = ConfidenceManager(initial_confidence=7.0)
        cm.record_failure("test")
        assert cm.state.current < 7.0

    def test_hybrys_risk_detection(self):
        cm = ConfidenceManager(initial_confidence=9.0)
        cm.record_failure("f1")
        cm.record_failure("f2")
        cm.record_failure("f3")
        cm.record_failure("f4")
        assert cm.state.is_at_hybrys_risk or cm.state.current < 7.5

    def test_reset_on_hybrys(self):
        cm = ConfidenceManager(initial_confidence=9.0)
        result = cm.reset_on_hybrys()
        assert result["confidence_after"] < 9.0

    def test_recommendation(self):
        cm = ConfidenceManager(initial_confidence=9.5)
        rec = cm.get_recommendation()
        assert "CAUTION" in rec["recommendation"]

    def test_streak(self):
        cm = ConfidenceManager(initial_confidence=5.0)
        for _ in range(5):
            cm.record_success("streak")
        assert cm.state.success_streak == 5

    def test_stats(self):
        cm = ConfidenceManager()
        cm.record_success("a")
        cm.record_failure("b")
        s = cm.stats()
        assert s["successes"] == 1
        assert s["failures"] == 1


class TestExperimentTracker:
    def test_start_experiment(self):
        et = ExperimentTracker()
        exp = et.start("Test synthesis", {"freq": 350e12})
        assert exp.status == "RUNNING"
        assert len(et.experiments) == 1

    def test_log_result(self):
        et = ExperimentTracker()
        exp = et.start("Test", {})
        updated = et.log_result(exp.experiment_id, {"energy": 100})
        assert updated.status in ("COMPLETED", "FAILED")

    def test_log_reward(self):
        et = ExperimentTracker()
        exp = et.start("Test", {})
        et.log_result(exp.experiment_id, {"ok": True})
        updated = et.log_reward(exp.experiment_id, 8.0)
        assert updated.reward == 8.0

    def test_stats(self):
        et = ExperimentTracker()
        et.start("Test", {})
        s = et.stats()
        assert s["total"] == 1


class TestNotifications:
    def test_notify(self):
        ns = NotificationSystem()
        n = ns.notify(NotificationLevel.INFO, "Test", "Message")
        assert n.level == NotificationLevel.INFO
        assert len(ns.notifications) == 1

    def test_hybrys_notification(self):
        ns = NotificationSystem()
        n = ns.notify_hybrys(9.5, 1.0)
        assert n.level == NotificationLevel.HYBRYS
        assert ns.hybrys_count == 1

    def test_milestone(self):
        ns = NotificationSystem()
        ns.notify_milestone("First synthesis validated")
        assert len(ns.milestones) == 1

    def test_format(self):
        n = Notification(NotificationLevel.WARNING, "Warn", "msg")
        formatted = n.format()
        assert "WARNING" in formatted

    def test_acknowledge(self):
        ns = NotificationSystem()
        ns.notify(NotificationLevel.INFO, "T", "M")
        assert len(ns.unacknowledged()) == 1
        ns.acknowledge_all()
        assert len(ns.unacknowledged()) == 0


class TestPipeline:
    def test_validate_synthesis(self):
        pipeline = ValidationPipeline()
        result = pipeline.validate(
            "Use 350 THz pulse at 1e-15 seconds to restore mitochondrial membrane potential in hepatocytes"
        )
        assert isinstance(result, PipelineResult)
        assert result.synthesis is not None
        assert result.action in ("advance_to_conclusion", "generate_antithesis")

    def test_pipeline_stats(self):
        pipeline = ValidationPipeline()
        pipeline.validate("Test synthesis with frequency 350e12")
        stats = pipeline.pipeline_stats()
        assert stats["runs"] == 1

    def test_inject_antithesis(self):
        pipeline = ValidationPipeline()
        antithesis = pipeline.inject_antithesis_to_engine(
            "Test", {"autopoietic_integrity": 0.2, "domain": "quantum_vacuum"}
        )
        assert "AUTOMATIC ANTITHESIS" in antithesis
        assert "20" in antithesis or "0.2" in antithesis

    def test_multiple_runs(self):
        pipeline = ValidationPipeline()
        for _ in range(3):
            pipeline.validate("Test synthesis")
        assert len(pipeline.history) == 3
