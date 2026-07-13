#!/usr/bin/env python3
"""
Boo Physical Constants — Fundamental Physics Reference (#023)
═══════════════════════════════════════════════════════════════
BELL 13450.50 | All values in SI units unless noted.
Source: CODATA 2022, PDG 2024.
"""

from dataclasses import dataclass
from typing import Dict

# ── Quantum ──
PLANCK_REDUCED = 1.054571817e-34      # ħ (J·s)
PLANCK = 6.62607015e-34               # h (J·s)
PLANCK_LENGTH = 1.616255e-35          # l_P (m)
PLANCK_TIME = 5.391247e-44            # t_P (s)
PLANCK_MASS = 2.176434e-8             # m_P (kg)
PLANCK_ENERGY = 1.9561e9              # E_P (J)

# ── Electromagnetic ──
SPEED_OF_LIGHT = 299792458            # c (m/s)
VACUUM_PERMITTIVITY = 8.8541878128e-12  # ε₀ (F/m)
VACUUM_PERMEABILITY = 1.25663706212e-6   # μ₀ (N/A²)
ELEMENTARY_CHARGE = 1.602176634e-19   # e (C)
FINE_STRUCTURE = 7.2973525693e-3      # α ≈ 1/137

# ── Thermodynamic ──
BOLTZMANN = 1.380649e-23              # k_B (J/K)
STEFAN_BOLTZMANN = 5.670374419e-8     # σ (W·m⁻²·K⁻⁴)
AVOGADRO = 6.02214076e23              # N_A (mol⁻¹)

# ── Gravitational/Cosmological ──
GRAVITATIONAL = 6.67430e-11           # G (N·m²/kg²)
HUBBLE_CONSTANT = 2.27e-18            # H₀ (s⁻¹) ≈ 70 km/s/Mpc
HUBBLE_KM_S_MPC = 70.0                # H₀ (km/s/Mpc)
CRITICAL_DENSITY = 8.62e-27           # ρ_c (kg/m³)
COSMOLOGICAL_CONSTANT = 1.089e-52     # Λ (m⁻²)
VACUUM_ENERGY_DENSITY = 5.96e-10      # ρ_vac (J/m³) — observed

# ── Casimir Effect ──
CASIMIR_FORCE_1UM = 1.3e-3            # F at 1μm separation (N/m²)
CASIMIR_CONSTANT = 1.3e-27            # π²·ħ·c / 240 (N·m²)

# ── Biological ──
ATP_SYNTHASE_RATE = 100               # molecules/s per enzyme
PROTEIN_FOLDING_ENERGY = 20.0         # kT units
CELL_RADIUS_DEFAULT = 10e-6           # 10 μm
MITOCHONDRIAL_MEMBRANE_POTENTIAL = 0.14  # ΔΨ (V)
AUTOPOIETIC_THRESHOLD = 0.73          # Minimum integrity
ANTHROPIC_EFFICIENCY = 0.42           # Maximum biological efficiency

# ── Laser/Pulse Parameters ──
ATTOSECOND = 1e-18                    # s
FEMTOSECOND = 1e-15                   # s
PICOSECOND = 1e-12                    # s
OPTICAL_FREQ_NEAR_IR = 350e12         # 350 THz = 850 nm
OPTICAL_FREQ_VISIBLE = 500e12         # 500 THz = 600 nm
THZ_RANGE_MIN = 0.1e12                # 0.1 THz
THZ_RANGE_MAX = 10e12                 # 10 THz

# ── Computed constants ──
CASIMIR_FORCE = lambda d: CASIMIR_CONSTANT / (d**4)  # Force at distance d (m)
VACUUM_ENERGY_DENSITY_QUANTUM = (PLANCK_REDUCED * SPEED_OF_LIGHT) / (2 * PLANCK_LENGTH**4)  # ≈ 10^113 J/m³ (unrenormalized)


@dataclass
class PhysicalConstants:
    """Structured access to all physical constants."""
    hbar: float = PLANCK_REDUCED
    c: float = SPEED_OF_LIGHT
    G: float = GRAVITATIONAL
    k_B: float = BOLTZMANN
    e: float = ELEMENTARY_CHARGE
    H0: float = HUBBLE_CONSTANT
    rho_vac: float = VACUUM_ENERGY_DENSITY

    def to_dict(self) -> Dict:
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}

    def casimir_force(self, distance_m: float) -> float:
        """Casimir force at given plate separation (N/m²)."""
        from math import pi
        return (pi**2 * self.hbar * self.c) / (240 * distance_m**4)

    def vacuum_energy(self, frequency_hz: float) -> float:
        """Zero-point energy: E = ħω/2."""
        return 0.5 * self.hbar * 2 * 3.1415926535 * frequency_hz

    def hubble_energy_density(self) -> float:
        """Critical energy density from Hubble expansion."""
        return 3 * self.H0**2 * self.c**2 / (8 * 3.1415926535 * self.G)
