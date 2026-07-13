#!/usr/bin/env python3
"""
Boo Quantum Fluctuations — Casimir Effect & Vacuum Energy (#016)
══════════════════════════════════════════════════════════════════
BELL 13450.50 | Simulates vacuum fluctuations for energy extraction.
"""

import numpy as np
from math import pi
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from ..constants import (
    PLANCK_REDUCED, SPEED_OF_LIGHT, CASIMIR_CONSTANT,
    VACUUM_ENERGY_DENSITY, BOLTZMANN, PLANCK,
)


@dataclass
class CasimirCavity:
    """A Casimir cavity with two parallel plates."""
    plate_distance: float      # meters (e.g., 10e-9 for 10nm)
    plate_area: float          # m² (e.g., 1e-4 for 1cm²)
    temperature: float = 300.0  # Kelvin
    medium_refractive_index: float = 1.0

    @property
    def force(self) -> float:
        """Casimir force between plates (N)."""
        # F = π²·ħ·c·A / (240·d⁴)
        force_per_area = (pi**2 * PLANCK_REDUCED * SPEED_OF_LIGHT) / (240 * self.plate_distance**4)
        return force_per_area * self.plate_area

    @property
    def energy_density(self) -> float:
        """Vacuum energy density inside cavity (J/m³)."""
        return (pi**2 * PLANCK_REDUCED * SPEED_OF_LIGHT) / (720 * self.plate_distance**4)

    @property
    def pressure(self) -> float:
        """Casimir pressure (Pa)."""
        return self.force / self.plate_area

    def force_at_distance(self, d: float) -> float:
        """Force at arbitrary distance."""
        return (pi**2 * PLANCK_REDUCED * SPEED_OF_LIGHT * self.plate_area) / (240 * d**4)

    def work_per_cycle(self, d_min: float, d_max: float) -> float:
        """Work extracted per expansion-contraction cycle (J)."""
        # W = ∫ F·dx from d_min to d_max
        const = (pi**2 * PLANCK_REDUCED * SPEED_OF_LIGHT * self.plate_area) / 240
        w_expand = const * (1/(d_min**3) - 1/(d_max**3)) / 3  # Positive work during contraction
        return abs(w_expand)

    def optimal_cycle(self, n_points: int = 100) -> Dict:
        """Find optimal d_min/d_max for maximum work per cycle."""
        d_mins = np.logspace(-9, -7, n_points)  # 1nm to 100nm
        best = {"work": 0, "d_min": 1e-9, "d_max": 10e-9}

        for d_min in d_mins:
            d_max = d_min * np.exp(1)  # Optimal expansion ~2.7x
            w = self.work_per_cycle(d_min, d_max)
            if w > best["work"]:
                best = {"work": w, "d_min": d_min, "d_max": d_max}

        return best


@dataclass
class QuantumFluctuation:
    """Models a single virtual particle pair fluctuation."""
    energy: float              # J
    lifetime: float            # s (Δt ~ ħ/ΔE)
    wavelength: float          # m
    frequency: float           # Hz

    @classmethod
    def from_frequency(cls, freq: float) -> "QuantumFluctuation":
        """Create fluctuation from frequency."""
        energy = PLANCK_REDUCED * 2 * pi * freq  # E = ħω
        lifetime = PLANCK_REDUCED / energy        # Δt ~ ħ/ΔE
        wavelength = SPEED_OF_LIGHT / freq
        return cls(energy=energy, lifetime=lifetime,
                   wavelength=wavelength, frequency=freq)

    @classmethod
    def from_wavelength(cls, wl: float) -> "QuantumFluctuation":
        """Create fluctuation from wavelength."""
        freq = SPEED_OF_LIGHT / wl
        return cls.from_frequency(freq)


class VacuumSimulator:
    """Simulates vacuum energy extraction over time."""

    def __init__(self, cavity: CasimirCavity):
        self.cavity = cavity
        self.history: List[Dict] = []

    def fluctuation_spectrum(self, temp: float = None, n_modes: int = 1000) -> np.ndarray:
        """Bose-Einstein distribution of vacuum modes."""
        T = temp or self.cavity.temperature
        frequencies = np.logspace(8, 18, n_modes)  # 100 MHz to 1 EHz
        # Zero-point + thermal
        zero_point = 0.5 * PLANCK_REDUCED * 2 * pi * frequencies
        if T > 0:
            beta = 1 / (BOLTZMANN * T)
            thermal = (PLANCK_REDUCED * 2 * pi * frequencies) / (np.exp(beta * PLANCK_REDUCED * 2 * pi * frequencies) - 1)
        else:
            thermal = 0
        return frequencies, zero_point + thermal

    def extractable_power(self, cycle_freq: float = 1.0) -> float:
        """Estimated extractable power from cyclic Casimir (W)."""
        opt = self.cavity.optimal_cycle()
        work_per_cycle = opt["work"]
        return work_per_cycle * cycle_freq

    def run_cycle(self, d_min: float, d_max: float, cycle_time: float = 1.0) -> Dict:
        """Run one Casimir cycle and record results."""
        work = self.cavity.work_per_cycle(d_min, d_max)
        power = work / cycle_time if cycle_time > 0 else 0
        result = {
            "d_min_nm": d_min * 1e9,
            "d_max_nm": d_max * 1e9,
            "work_joules": work,
            "power_watts": power,
            "force_min_N": self.cavity.force_at_distance(d_min),
            "force_max_N": self.cavity.force_at_distance(d_max),
        }
        self.history.append(result)
        return result

    def scale_analysis(self, target_power: float = 1000.0) -> Dict:
        """What plate area is needed for target power output?"""
        opt = self.cavity.optimal_cycle()
        work_per_m2 = opt["work"] / self.cavity.plate_area
        area_needed = target_power / (work_per_m2 * 1.0)  # 1 Hz cycle
        return {
            "target_power_watts": target_power,
            "work_per_m2_per_cycle": work_per_m2,
            "area_needed_m2": area_needed,
            "area_needed_cm2": area_needed * 10000,
            "current_area_cm2": self.cavity.plate_area * 10000,
            "scale_factor": area_needed / self.cavity.plate_area,
        }
