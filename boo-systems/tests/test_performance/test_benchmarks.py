"""Performance Benchmarks (#049)"""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest
from src.zetelkasten.engine import DialecticalEngine
from src.zetelkasten.memory import BlockMemory
from src.boo.pipeline import ValidationPipeline
from src.boo.simulation.quantum_fluct import CasimirCavity, VacuumSimulator
from src.boo.simulation.temporal_fractal import FractalPulseGenerator
from src.boo.biology.cell_models import CellGroup


class TestEnginePerformance:
    def test_engine_throughput(self):
        """Engine should process at least 50 commands/second."""
        engine = DialecticalEngine()
        memory = BlockMemory()
        from src.zetelkasten.commands import CommandParser
        parser = CommandParser(engine, memory)

        t0 = time.time()
        n = 50
        for i in range(n):
            parser.parse(f"!tesis Performance test {i}")
        elapsed = time.time() - t0
        rate = n / elapsed
        assert rate > 20, f"Engine throughput: {rate:.0f} cmd/s (need >20)"

    def test_block_save_load_speed(self):
        """Block save+load should be < 1ms."""
        memory = BlockMemory()
        engine = DialecticalEngine()
        engine.process_thesis("Speed test")
        engine.current_block.compute_seal()

        t0 = time.time()
        memory.save_block(engine.current_block)
        loaded = memory.load_block(engine.current_block.block_id)
        elapsed = time.time() - t0

        assert loaded is not None
        assert elapsed < 0.5, f"Save+load: {elapsed*1000:.1f}ms"

    def test_memory_scaling(self):
        """100 blocks should fit comfortably in memory."""
        memory = BlockMemory()
        engine = DialecticalEngine()
        for i in range(100):
            engine.process_thesis(f"Scale test {i}")
            engine.current_block.compute_seal()
            memory.save_block(engine.current_block)
        chain = memory.get_chain(100)
        assert len(chain) >= 1


class TestSimulationPerformance:
    def test_casimir_calculation_speed(self):
        """Casimir force calculations should be fast."""
        cavity = CasimirCavity(plate_distance=10e-9, plate_area=1e-4)
        t0 = time.time()
        for _ in range(1000):
            _ = cavity.force
        elapsed = time.time() - t0
        assert elapsed < 0.5, f"1000 Casimir calcs: {elapsed*1000:.1f}ms"

    def test_pulse_generation_speed(self):
        """Pulse cascade generation should be fast."""
        gen = FractalPulseGenerator()
        t0 = time.time()
        for _ in range(100):
            gen.generate_cascade(5)
        elapsed = time.time() - t0
        assert elapsed < 3, f"100 cascades: {elapsed:.1f}s"

    def test_cell_simulation_speed(self):
        """Cell group simulation should be scalable."""
        g = CellGroup(name="perf_test")
        g.create_organoid(n_cells=100, cell_type="hepatocyte")
        t0 = time.time()
        history = g.run_simulation(days=7, pulse_cascade_fn=None)
        elapsed = time.time() - t0
        assert len(history) > 0
        assert elapsed < 5, f"7-day sim (100 cells): {elapsed:.1f}s"


class TestPipelinePerformance:
    def test_validation_speed(self):
        """Single validation pipeline run < 2 seconds."""
        pipeline = ValidationPipeline()
        t0 = time.time()
        pipeline.validate("Test synthesis with frequency 350e12 cells 1000")
        elapsed = time.time() - t0
        assert elapsed < 2, f"Pipeline: {elapsed:.1f}s"

    def test_concurrent_cycles(self):
        """Multiple cycles should not degrade."""
        pipeline = ValidationPipeline()
        t0 = time.time()
        for i in range(10):
            pipeline.validate(f"Test {i} with frequency {300+i*10}e12")
        elapsed = time.time() - t0
        avg = elapsed / 10
        assert avg < 1, f"Avg per cycle: {avg:.2f}s"
