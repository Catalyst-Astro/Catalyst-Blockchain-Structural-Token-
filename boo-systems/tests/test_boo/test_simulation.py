"""
Test Boo Simulation Modules (#016-#024)
══════════════════════════════════════════
BELL 13450.50
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest
import numpy as np
from src.boo.simulation.quantum_fluct import CasimirCavity, QuantumFluctuation, VacuumSimulator
from src.boo.simulation.temporal_fractal import FractalPulseGenerator, Pulse
from src.boo.simulation.energy_extractor import HubbleCasimirDynamo
from src.boo.simulation.path_integral import PathIntegralSimulator
from src.boo.biology.proteostasis import Protein, Chaperone, ProteostasisNetwork
from src.boo.biology.cell_models import Cell, CellGroup
from src.boo.constants import *


class TestQuantumFluct:
    def test_casimir_force(self):
        cavity = CasimirCavity(plate_distance=10e-9, plate_area=1e-4)
        force = cavity.force
        assert force > 0
        assert force < 1e6  # Reasonable bound

    def test_force_scales_with_distance(self):
        c1 = CasimirCavity(plate_distance=10e-9, plate_area=1e-4)
        c2 = CasimirCavity(plate_distance=20e-9, plate_area=1e-4)
        # Force ~ 1/d^4, so doubling distance = 1/16 force
        ratio = c1.force / c2.force
        assert 14 < ratio < 18

    def test_optimal_cycle(self):
        cavity = CasimirCavity(plate_distance=10e-9, plate_area=1e-4)
        opt = cavity.optimal_cycle(n_points=20)
        assert opt["work"] > 0
        assert opt["d_min"] > 0

    def test_fluctuation_creation(self):
        fluct = QuantumFluctuation.from_frequency(350e12)
        assert fluct.energy > 0
        assert fluct.lifetime > 0

    def test_vacuum_simulator(self):
        cavity = CasimirCavity(plate_distance=10e-9, plate_area=1e-4)
        sim = VacuumSimulator(cavity)
        freqs, spectrum = sim.fluctuation_spectrum(n_modes=100)
        assert len(freqs) == 100
        assert all(s >= 0 for s in spectrum)

    def test_scale_analysis(self):
        cavity = CasimirCavity(plate_distance=10e-9, plate_area=1e-4)
        sim = VacuumSimulator(cavity)
        analysis = sim.scale_analysis(target_power=1.0)
        assert analysis["scale_factor"] > 0


class TestTemporalFractal:
    def test_pulse_creation(self):
        p = Pulse(frequency=350e12, amplitude=0.5, duration=1e-12)
        assert p.frequency == 350e12
        assert p.energy > 0

    def test_cascade_generation(self):
        gen = FractalPulseGenerator(base_freq=350e12)
        pulses = gen.generate_cascade(n_scales=7)
        assert len(pulses) == 7
        assert pulses[0].frequency < pulses[-1].frequency

    def test_fractal_resonance(self):
        gen = FractalPulseGenerator(base_freq=100e12)
        gen.generate_cascade(n_scales=4)
        resonances = gen.fractal_resonance()
        assert isinstance(resonances, dict)

    def test_spectrum(self):
        gen = FractalPulseGenerator()
        gen.generate_cascade(5)
        spec = gen.spectrum()
        assert spec["scales"] == 5

    def test_waveform_synthesis(self):
        gen = FractalPulseGenerator()
        gen.generate_cascade(3)
        t, wf = gen.synthesize_waveform(total_time=1e-6, sample_rate=1e12)
        assert len(t) > 0
        assert len(wf) == len(t)


class TestEnergyExtractor:
    def test_dynamo_creation(self):
        dynamo = HubbleCasimirDynamo()
        assert dynamo.plate_area > 0
        assert dynamo.casimir_force > 0

    def test_energy_cycle(self):
        dynamo = HubbleCasimirDynamo(plate_area=1e-4, initial_separation=10e-9)
        cycle = dynamo.energy_per_cycle(1e17)  # ~3 billion years
        assert "net_energy_j" in cycle

    def test_scaling_law(self):
        dynamo = HubbleCasimirDynamo(plate_area=1e-4, initial_separation=10e-9)
        scaling = dynamo.scaling_law()
        assert len(scaling) == 6
        for key in scaling:
            assert "net_power_w" in scaling[key]

    def test_autonomy_timeline(self):
        dynamo = HubbleCasimirDynamo(plate_area=1e-4, initial_separation=10e-9)
        timeline = dynamo.time_to_energy_autonomy(target_power_w=1e-30)
        assert "current_power_w" in timeline


class TestPathIntegral:
    def test_random_path(self):
        sim = PathIntegralSimulator()
        path = sim.generate_random_path(0, 1, 1.0, n_steps=50)
        assert len(path.points) > 0
        assert path.total_action != 0

    def test_monte_carlo(self):
        sim = PathIntegralSimulator()
        result = sim.monte_carlo_sample(0, 1, 1.0, n_paths=100, n_steps=50)
        assert result["n_paths"] == 100
        assert result["most_probable_action"] != 0

    def test_trajectory(self):
        sim = PathIntegralSimulator()
        sim.monte_carlo_sample(0, 1, 1.0, n_paths=50, n_steps=30)
        traj = sim.most_probable_trajectory()
        assert len(traj) > 0


class TestProteostasis:
    def test_protein_creation(self):
        p = Protein("Test", sequence_length=200, native_energy=-30)
        assert p.folding_state == 1.0
        assert not p.is_damaged

    def test_folding(self):
        p = Protein("Test", sequence_length=200, native_energy=-30)
        p.folding_state = 0.5
        result = p.apply_pulse(350e12, 0.5)
        assert "folding_after" in result

    def test_chaperone(self):
        chap = Chaperone(efficiency=0.9)
        p = Protein("Test", sequence_length=200, native_energy=-30)
        p.folding_state = 0.4
        chap.assist_folding(p)
        assert chap.atp_consumed > 0

    def test_network(self):
        net = ProteostasisNetwork()
        net.create_default_network(n_proteins=20, n_chaperones=3)
        assert len(net.proteins) == 20
        assert 0 < net.average_folding <= 1.0


class TestCellModels:
    def test_cell_creation(self):
        c = Cell("test_0", "hepatocyte")
        assert c.atp_level == 100
        assert not c.is_senescent

    def test_metabolism(self):
        c = Cell("test_0", "hepatocyte")
        c.metabolize(24)
        assert c.age_days > 0

    def test_pulse_effect(self):
        c = Cell("test_0", "hepatocyte", atp_level=70)
        result = c.apply_pulse(350e12, 0.8)
        assert result["effective"]

    def test_cell_group(self):
        g = CellGroup(name="liver_organoid")
        g.create_organoid(n_cells=50, cell_type="hepatocyte")
        assert g.population == 50
        assert 0 <= g.healthy_fraction <= 1

    def test_pulse_cascade_on_group(self):
        from src.boo.simulation.temporal_fractal import FractalPulseGenerator
        g = CellGroup(name="test_group")
        g.create_organoid(n_cells=30, cell_type="hepatocyte")
        gen = FractalPulseGenerator(base_freq=350e12)
        pulses = gen.generate_cascade(3)
        result = g.apply_pulse_cascade(pulses)
        assert result["cells_processed"] > 0

    def test_simulation(self):
        g = CellGroup(name="sim_test")
        g.create_organoid(n_cells=20, cell_type="hepatocyte")
        history = g.run_simulation(days=14)
        assert len(history) > 0
