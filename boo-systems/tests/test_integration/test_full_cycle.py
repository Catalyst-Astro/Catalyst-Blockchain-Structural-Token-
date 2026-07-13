"""Integration Tests — Full Zettelkasten + Boo Cycle (#047)"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest
from src.zetelkasten.engine import DialecticalEngine
from src.zetelkasten.memory import BlockMemory
from src.zetelkasten.commands import CommandParser
from src.boo.pipeline import ValidationPipeline
from src.boo.confidence_manager import ConfidenceManager
from src.boo.notifications import NotificationSystem, NotificationLevel
from src.core.constants import PentetraktysPhase


class TestFullCycle:
    """End-to-end dialectical cycle with Boo validation."""

    def test_complete_pentetraktys_cycle(self):
        engine = DialecticalEngine()
        memory = BlockMemory()
        parser = CommandParser(engine, memory)
        pipeline = ValidationPipeline()

        # Phase 1: Thesis
        r1 = parser.parse("!tesis Mitocondria requiere 350 THz para regenerarse")
        assert r1["ok"] and engine.phase == PentetraktysPhase.THESIS

        # Phase 2: Antithesis
        r2 = parser.parse("!contra Pulso de 350 THz genera estres termico")
        assert r2["ok"]

        # Phase 3: Synthesis
        r3 = engine.process_synthesis("Usar 220 THz preparacion + 350 THz reducido")
        assert engine.phase == PentetraktysPhase.SYNTHESIS

        # Phase 4: Validate with Boo pipeline
        result = pipeline.validate(
            "Usar pulso bifasico: 220 THz preparacion + 350 THz reducido 30%"
        )
        assert result.action in ("advance_to_conclusion", "generate_antithesis")

        # Phase 5: Conclusion or Hybrys
        if result.validated:
            engine.process_conclusion(result.synthesis, result.synthesis)
            assert engine.phase == PentetraktysPhase.CONCLUSION

            # Reward
            engine.confidence = 6.0
            reward = engine.process_reward(8.0)
            assert reward["status"] == "CLEAN"
        else:
            # Antithesis auto-generated
            assert result.auto_antithesis

        # Seal
        seal = engine.seal_current_block()
        assert len(seal) > 0

    def test_hybrys_cycle(self):
        engine = DialecticalEngine()
        memory = BlockMemory()
        parser = CommandParser(engine, memory)
        notifier = NotificationSystem()

        parser.parse("!tesis Probar hybrys")
        engine.confidence = 10.0

        with pytest.raises(Exception):
            engine.process_reward(0.0)

        notifier.notify_hybrys(10.0, 0.0, "Overconfident without evidence")
        assert notifier.hybrys_count == 1

        # Reset
        engine.process_reset("Validar con evidencia antes de confiar")
        assert engine.phase == PentetraktysPhase.THESIS
        assert engine.confidence < 6.0

    def test_confidence_evolution(self):
        cm = ConfidenceManager(initial_confidence=5.0)
        assert cm.state.current == 5.0

        # Series of successes
        for _ in range(5):
            cm.record_success("test")
        assert cm.state.success_streak == 5
        assert cm.state.current > 5.5

        # A failure resets success streak
        cm.record_failure("test")
        assert cm.state.success_streak == 0
        assert cm.state.failure_streak == 1

    def test_pipeline_with_cell_simulation(self):
        """Validate synthesis about cell treatment."""
        pipeline = ValidationPipeline()
        result = pipeline.validate(
            "Aplicar 350 THz 10e-15s a hepatocitos para restaurar ATP"
        )
        assert result.simulation is not None
        assert "domain" in result.simulation
        stats = pipeline.pipeline_stats()
        assert stats["runs"] > 0

    def test_rapid_cycles(self):
        """System should handle rapid cycle execution."""
        engine = DialecticalEngine()
        pipeline = ValidationPipeline()
        t0 = time.time()

        for i in range(5):
            engine.process_thesis(f"Test thesis {i}")
            result = pipeline.validate(f"Test synthesis {i} with frequency {300+i*10}e12")

        elapsed = time.time() - t0
        assert elapsed < 10  # Should complete 5 cycles in < 10 seconds
