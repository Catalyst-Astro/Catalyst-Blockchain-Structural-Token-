#!/usr/bin/env python3
"""
Boo Cell Models — Cellular Dynamics & Autopoiesis (#020)
══════════════════════════════════════════════════════════
BELL 13450.50 | Simulates cell groups, senescence, ATP dynamics,
and response to temporal fractal pulses.
"""

import numpy as np
from math import exp, log
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional

from ..constants import (
    ATP_SYNTHASE_RATE, AUTOPOIETIC_THRESHOLD,
    MITOCHONDRIAL_MEMBRANE_POTENTIAL, ANTHROPIC_EFFICIENCY
)


@dataclass
class Cell:
    """A single biological cell."""
    id: str
    cell_type: str             # hepatocyte, neuron, cardiomyocyte, fibroblast
    age_days: float = 0
    atp_level: float = 100.0   # % of optimal
    ros_level: float = 10.0    # % of baseline
    membrane_potential: float = 0.14  # ΔΨ (V)
    senescence_score: float = 0.0  # 0 = young, 1 = senescent
    autopoietic_integrity: float = 0.95
    damage_accumulated: float = 0.0

    @property
    def is_senescent(self) -> bool:
        return self.senescence_score > 0.5

    @property
    def is_healthy(self) -> bool:
        return (self.autopoietic_integrity > AUTOPOIETIC_THRESHOLD and
                not self.is_senescent and
                self.atp_level > 50)

    def metabolize(self, dt_hours: float = 1.0):
        """Run one metabolic cycle."""
        # ATP production decreases with age and damage
        base_production = ATP_SYNTHASE_RATE * self.autopoietic_integrity
        ros_generated = self.ros_level * (1 + self.damage_accumulated) * 0.01

        self.atp_level += base_production * dt_hours * 0.1
        self.atp_level -= ros_generated * dt_hours * 0.05  # ROS consumes ATP
        self.atp_level = max(0, min(200, self.atp_level))

        # Senescence accumulates with age + ROS
        self.senescence_score += (self.age_days / 36500 + ros_generated * 0.001) * dt_hours
        self.senescence_score = min(1.0, self.senescence_score)

        # Damage accumulates if ROS > baseline
        if self.ros_level > 5:
            self.damage_accumulated += (self.ros_level - 5) * 0.0001 * dt_hours

        # Autopoietic integrity degrades with damage
        self.autopoietic_integrity = max(0.1, 0.95 - self.damage_accumulated * 0.5)

        # Age increment
        self.age_days += dt_hours / 24

    def apply_pulse(self, frequency: float, amplitude: float, dt_hours: float = 0.01) -> Dict:
        """Apply a therapeutic pulse to the cell."""
        before = {
            "atp": self.atp_level,
            "membrane": self.membrane_potential,
            "senescence": self.senescence_score,
        }

        # Resonant frequencies by cell type
        resonances = {
            "hepatocyte": 350e12,     # 350 THz (near-IR)
            "neuron": 100e12,          # 100 THz
            "cardiomyocyte": 50e12,    # 50 THz
            "fibroblast": 200e12,      # 200 THz
        }
        resonant_freq = resonances.get(self.cell_type, 350e12)
        detuning = abs(frequency - resonant_freq) / resonant_freq
        resonance = max(0, 1 - detuning * 5)

        # Positive effects at resonance
        if resonance > 0.5:
            atp_boost = amplitude * resonance * 15 * dt_hours * 100
            ros_reduction = amplitude * resonance * 20 * dt_hours
            membrane_boost = amplitude * resonance * 0.01 * dt_hours

            self.atp_level = min(200, self.atp_level + atp_boost)
            self.ros_level = max(0, self.ros_level - ros_reduction)
            self.membrane_potential = min(0.18, self.membrane_potential + membrane_boost)
            self.senescence_score = max(0, self.senescence_score - amplitude * resonance * 0.002 * dt_hours)
            self.autopoietic_integrity = min(1.0, self.autopoietic_integrity + amplitude * resonance * 0.001 * dt_hours)

        # Negative effects off-resonance
        if detuning > 0.5 and amplitude > 0.7:
            self.ros_level = min(100, self.ros_level + amplitude * detuning * 30 * dt_hours)
            self.damage_accumulated += amplitude * detuning * 0.01 * dt_hours

        self.metabolize(dt_hours)

        return {
            "cell": self.id,
            "type": self.cell_type,
            "resonance": resonance,
            "atp_before": before["atp"],
            "atp_after": self.atp_level,
            "ros_change": self.ros_level - before.get("ros", self.ros_level),
            "effective": resonance > 0.5,
        }


@dataclass
class CellGroup:
    """A population of cells (organoid, tissue sample)."""

    cells: List[Cell] = field(default_factory=list)
    name: str = "unnamed"
    anthropy: float = 0.5  # 0 = maximum entropy, 1 = maximum order

    @property
    def population(self) -> int:
        return len(self.cells)

    @property
    def healthy_fraction(self) -> float:
        if not self.cells:
            return 0
        return sum(1 for c in self.cells if c.is_healthy) / len(self.cells)

    @property
    def senescent_fraction(self) -> float:
        if not self.cells:
            return 0
        return sum(1 for c in self.cells if c.is_senescent) / len(self.cells)

    @property
    def avg_atp(self) -> float:
        if not self.cells:
            return 0
        return sum(c.atp_level for c in self.cells) / len(self.cells)

    @property
    def avg_ros(self) -> float:
        if not self.cells:
            return 0
        return sum(c.ros_level for c in self.cells) / len(self.cells)

    def create_organoid(self, n_cells: int = 1000, cell_type: str = "hepatocyte",
                        age_variation: float = 30, damage_base: float = 0.1):
        """Create a 3D organoid with given cell type."""
        self.cells = []
        for i in range(n_cells):
            age = np.random.uniform(0, age_variation)
            self.cells.append(Cell(
                id=f"{cell_type}_{i:04d}",
                cell_type=cell_type,
                age_days=age * 365,
                atp_level=np.random.uniform(70, 100),
                ros_level=np.random.uniform(5, 15),
                senescence_score=min(1.0, age / 100 + np.random.uniform(0, 0.1)),
                damage_accumulated=np.random.uniform(0, damage_base),
            ))
        self.anthropy = self.healthy_fraction * ANTHROPIC_EFFICIENCY

    def apply_pulse_cascade(self, pulses: List, dt_hours: float = 0.01) -> Dict:
        """Apply a temporal fractal pulse cascade to the entire group."""
        results = []
        for cell in self.cells[:min(100, len(self.cells))]:  # Sample for speed
            for pulse in pulses[:5]:  # Top 5 pulses
                r = cell.apply_pulse(pulse.frequency, pulse.amplitude, dt_hours)
            results.append(r)

        self.anthropy = self.healthy_fraction * ANTHROPIC_EFFICIENCY

        return {
            "cells_processed": len(results),
            "effective_treatments": sum(1 for r in results if r.get("effective")),
            "avg_atp_before": sum(r["atp_before"] for r in results) / len(results),
            "avg_atp_after": self.avg_atp,
            "healthy_fraction": self.healthy_fraction,
            "senescent_fraction": self.senescent_fraction,
            "anthropy": self.anthropy,
            "ros_level": self.avg_ros,
        }

    def run_simulation(self, days: int = 90, pulse_cascade_fn=None) -> List[Dict]:
        """Run a multi-day simulation with optional daily pulse treatment."""
        history = []
        for day in range(days):
            # Apply pulse if function provided
            if pulse_cascade_fn:
                pulses = pulse_cascade_fn(day)
                if pulses:
                    self.apply_pulse_cascade(pulses, dt_hours=1.0)

            # Natural aging for all cells
            for cell in self.cells:
                cell.metabolize(24.0)

            self.anthropy = self.healthy_fraction * ANTHROPIC_EFFICIENCY

            if day % 7 == 0:  # Weekly snapshot
                history.append({
                    "day": day,
                    "healthy": self.healthy_fraction,
                    "senescent": self.senescent_fraction,
                    "avg_atp": self.avg_atp,
                    "avg_ros": self.avg_ros,
                    "anthropy": self.anthropy,
                })

        return history
