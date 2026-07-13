"""
Test Zettelkasten Dialectical Engine
═══════════════════════════════════════
BELL 13450.50 — Tests must pass before any commit.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest
from src.zetelkasten.engine import DialecticalEngine, ZettelBlock
from src.zetelkasten.validators import HybrysDetector
from src.zetelkasten.commands import CommandParser
from src.zetelkasten.memory import BlockMemory
from src.core.constants import PentetraktysPhase
from src.core.exceptions import HybrisTriggered


class TestDialecticalEngine:
    def test_initial_state(self):
        engine = DialecticalEngine()
        assert engine.phase == PentetraktysPhase.THESIS
        assert engine.confidence == 7.0
        assert engine.block_counter == 0

    def test_thesis_creates_block(self):
        engine = DialecticalEngine()
        block = engine.process_thesis("El universo es fractal")
        assert block.thesis == "El universo es fractal"
        assert engine.phase == PentetraktysPhase.THESIS
        assert engine.block_counter == 1

    def test_antithesis(self):
        engine = DialecticalEngine()
        engine.process_thesis("Tesis A")
        block = engine.process_antithesis("Contra A")
        assert block.antithesis == "Contra A"
        assert engine.phase == PentetraktysPhase.ANTITHESIS

    def test_synthesis(self):
        engine = DialecticalEngine()
        engine.process_thesis("Tesis A")
        engine.process_antithesis("Contra A")
        block = engine.process_synthesis("Tesis A UNIDA con Contra A")
        assert block is not None
        assert block.synthesis is not None
        assert engine.phase == PentetraktysPhase.SYNTHESIS

    def test_conclusion(self):
        engine = DialecticalEngine()
        engine.process_thesis("T")
        block = engine.process_conclusion("Acción resultante")
        assert block.conclusion == "Acción resultante"
        assert engine.phase == PentetraktysPhase.CONCLUSION

    def test_reward_clean(self):
        engine = DialecticalEngine()
        engine.process_thesis("T")
        engine.confidence = 5.0
        result = engine.process_reward(8.0)
        assert result["status"] == "CLEAN"

    def test_hybrys_detection(self):
        engine = DialecticalEngine()
        engine.process_thesis("T")
        engine.confidence = 10.0
        with pytest.raises(HybrisTriggered):
            engine.process_reward(0.0)

    def test_reset(self):
        engine = DialecticalEngine()
        engine.process_thesis("T")
        engine.confidence = 9.5
        try:
            engine.process_reward(1.0)
        except HybrisTriggered:
            pass
        block = engine.process_reset("No confiar sin evidencia")
        assert engine.phase == PentetraktysPhase.THESIS
        assert "RESET LESSON" in block.thesis

    def test_block_seal(self):
        block = ZettelBlock(block_id="TEST-001", phase="tesis", thesis="Test")
        seal = block.compute_seal()
        assert len(seal) == 64
        # Seal is deterministic
        seal2 = block.compute_seal()
        assert seal == seal2

    def test_full_cycle(self):
        """Complete Pentetraktys cycle."""
        engine = DialecticalEngine()

        # Phase 1: Thesis
        engine.process_thesis("La energía del vacío es infinita")
        assert engine.phase == PentetraktysPhase.THESIS

        # Phase 2: Antithesis
        engine.process_antithesis("Pero la medición muestra valores finitos")
        assert engine.phase == PentetraktysPhase.ANTITHESIS

        # Phase 3: Synthesis
        engine.process_synthesis("La energía es infinita en teoría, finita en medición")
        assert engine.phase == PentetraktysPhase.SYNTHESIS

        # Phase 4: Conclusion
        engine.process_conclusion("Investigar el gap teoría-medición")
        assert engine.phase == PentetraktysPhase.CONCLUSION

        # Phase 5: Reward (clean)
        engine.confidence = 6.0
        result = engine.process_reward(7.0)
        assert result["status"] == "CLEAN"


class TestHybrysDetector:
    def test_clean(self):
        d = HybrysDetector()
        result = d.check(5.0, 8.0)
        assert result["status"] == "CLEAN"

    def test_warning(self):
        d = HybrysDetector()
        result = d.check(8.0, 7.0)  # conf moderate, reward OK
        assert result["golden_rule_violated"] == False
        assert result["status"] in ("CLEAN", "WARNING")

    def test_critical(self):
        d = HybrysDetector()
        result = d.check(9.5, 1.0)
        assert result["status"] == "CRITICAL"
        assert result["reset_required"]


class TestBlockMemory:
    def test_save_and_load(self, tmp_path):
        memory = BlockMemory(storage_dir=str(tmp_path))
        block = ZettelBlock(block_id="T-001", phase="tesis", thesis="Test")
        block.compute_seal()
        memory.save_block(block)

        loaded = memory.load_block("T-001")
        assert loaded is not None
        assert loaded["thesis"] == "Test"
        assert loaded["seal"] == block.seal

    def test_chain_integrity(self, tmp_path):
        memory = BlockMemory(storage_dir=str(tmp_path))
        for i in range(3):
            b = ZettelBlock(block_id=f"T-{i:03d}", phase="tesis", thesis=f"Test {i}")
            b.compute_seal()
            memory.save_block(b)

        result = memory.verify_chain()
        assert result["integrity"] == "INTACT"
        assert result["valid"] == 3


class TestCommandParser:
    def test_parse_tesis(self):
        engine = DialecticalEngine()
        memory = BlockMemory()
        parser = CommandParser(engine, memory)
        result = parser.parse("!tesis El universo es fractal")
        assert result["ok"]
        assert result["action"] == "thesis"
        assert engine.phase == PentetraktysPhase.THESIS

    def test_parse_unknown(self):
        engine = DialecticalEngine()
        memory = BlockMemory()
        parser = CommandParser(engine, memory)
        result = parser.parse("!inventado")
        assert not result["ok"]
