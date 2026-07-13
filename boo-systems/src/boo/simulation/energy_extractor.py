#!/usr/bin/env python3
"""
Boo Hubble Energy Extractor — Casimir-Hubble Dynamo (#018)
══════════════════════════════════════════════════════════
BELL 13450.50 | Extracts energy from vacuum using cosmic expansion
as the "free" separation mechanism for Casimir plates.

Principle:
  1. Hubble expansion provides free plate separation
  2. Casimir force pulls plates together (doing work)
  3. Net energy = work done by Casimir - work to reset plates at new H₀ scale
  4. Over cosmic time, this is net positive energy from vacuum
"""

import numpy as np
from math import pi, exp
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from ..constants import (
    HUBBLE_CONSTANT, SPEED_OF_LIGHT, PLANCK_REDUCED,
    VACUUM_ENERGY_DENSITY, CASIMIR_CONSTANT,
)


@dataclass
class HubbleCasimirDynamo:
    """
    A Casimir cavity coupled to Hubble expansion.
    The expansion of the universe provides the "free" separation of plates.
    """
    plate_area: float = 1e-4       # m² (1 cm²)
    initial_separation: float = 10e-9  # 10 nm
    hubble_rate: float = HUBBLE_CONSTANT  # s⁻¹
    efficiency: float = 0.05        # 5% mechanical efficiency

    @property
    def casimir_force(self) -> float:
        """Current Casimir force (N)."""
        return (pi**2 * PLANCK_REDUCED * SPEED_OF_LIGHT * self.plate_area) / \
               (240 * self.initial_separation**4)

    def hubble_expansion_rate(self, distance: float = None) -> float:
        """Rate at which Hubble expansion separates plates (m/s)."""
        d = distance or self.initial_separation
        return self.hubble_rate * d

    def separation_after_time(self, seconds: float) -> float:
        """Plate separation after t seconds of Hubble expansion."""
        return self.initial_separation * exp(self.hubble_rate * seconds)

    def work_from_casimir(self, d_start: float, d_end: float) -> float:
        """Work done by Casimir force moving from d_start to d_end (J)."""
        # W = ∫ F·dx = ∫ (C/x⁴)·dx = C·(1/d_start³ - 1/d_end³)/3
        C = (pi**2 * PLANCK_REDUCED * SPEED_OF_LIGHT * self.plate_area) / 240
        return C * (1/d_start**3 - 1/d_end**3) / 3

    def energy_per_cycle(self, cycle_time: float = 1.0) -> Dict:
        """
        Calculate net energy per Hubble-Casimir cycle.

        Phase 1: Hubble expands plates freely (no work needed)
        Phase 2: Casimir pulls plates together (work extracted)
        Phase 3: Reset mechanism returns to initial separation (cost)
        """
        d_expanded = self.separation_after_time(cycle_time)
        # Check if expansion is meaningful
        if d_expanded - self.initial_separation < 1e-15:
            return {"net_energy": 0, "status": "expansion_too_small",
                    "d_expanded": d_expanded, "cycle_time_s": cycle_time}

        # Work extracted during Casimir contraction
        w_casimir = abs(self.work_from_casimir(d_expanded, self.initial_separation))

        # Work needed to reset (piezoelectric, etc.) — proportional to force
        w_reset = self.casimir_force * (d_expanded - self.initial_separation) / self.efficiency

        net = w_casimir - w_reset

        return {
            "net_energy_j": net,
            "casimir_work_j": w_casimir,
            "reset_work_j": w_reset,
            "d_expanded_m": d_expanded,
            "d_initial_m": self.initial_separation,
            "cycle_time_s": cycle_time,
            "net_power_w": net / cycle_time if cycle_time > 0 else 0,
            "status": "NET_POSITIVE" if net > 0 else "NET_NEGATIVE",
        }

    def optimize_parameters(self) -> Dict:
        """Find optimal separation and cycle time for maximum net power."""
        best = {"power": 0, "separation": 1e-9, "cycle_time": 1.0}
        separations = np.logspace(-9, -6, 50)  # 1nm to 1μm
        cycle_times = np.logspace(-3, 3, 50)   # 1ms to 1000s

        for d in separations[::5]:  # Sample to keep fast
            self.initial_separation = d
            for t in cycle_times[::5]:
                result = self.energy_per_cycle(t)
                if result["net_power_w"] > best["power"]:
                    best = {"power": result["net_power_w"], "separation": d,
                            "cycle_time": t, "net_energy": result["net_energy_j"]}

        self.initial_separation = best["separation"]
        return best

    def scaling_law(self) -> Dict:
        """How does power scale with plate area and separation?"""
        areas_cm2 = [0.01, 0.1, 1, 10, 100, 1000]
        results = {}
        for a in areas_cm2:
            self.plate_area = a * 1e-4
            cycle = self.energy_per_cycle(1.0)
            results[f"{a}_cm2"] = {
                "net_power_w": cycle["net_power_w"],
                "casimir_force_n": self.casimir_force,
                "power_density_w_m2": cycle["net_power_w"] / (a * 1e-4) if a > 0 else 0,
            }
        return results

    def time_to_energy_autonomy(self, target_power_w: float = 1000) -> Dict:
        """How long until this technology can power itself?"""
        current = self.energy_per_cycle(1.0)
        current_power = max(current["net_power_w"], 1e-20)

        # Moore's law for Casimir: power density doubles every 2 years
        doublings_needed = np.log2(target_power_w / current_power)
        years = doublings_needed * 2

        return {
            "current_power_w": current_power,
            "target_power_w": target_power_w,
            "doublings_needed": doublings_needed,
            "years_estimated": max(0, years),
            "plate_area_needed_m2": self.plate_area * (target_power_w / current_power),
        }
