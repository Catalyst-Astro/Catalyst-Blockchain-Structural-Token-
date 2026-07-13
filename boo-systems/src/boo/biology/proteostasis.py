#!/usr/bin/env python3
"""
Boo Proteostasis — Protein Folding Control (#019)
══════════════════════════════════════════════════
BELL 13450.50 | Simulates protein folding, chaperone interaction,
and aggregation risk under external pulse stimulation.
"""

import numpy as np
from math import exp, log
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional

from ..constants import BOLTZMANN, PROTEIN_FOLDING_ENERGY


@dataclass
class Protein:
    """A single protein with folding state."""
    name: str
    sequence_length: int       # amino acids
    native_energy: float        # kJ/mol — energy of correctly folded state
    folding_state: float = 1.0  # 1.0 = native, 0.0 = unfolded
    damage_score: float = 0.0   # accumulated damage
    aggregation_risk: float = 0.0

    @property
    def is_folded(self) -> bool:
        return self.folding_state > 0.8

    @property
    def is_damaged(self) -> bool:
        return self.damage_score > 0.3

    def fold(self, energy_input: float, temperature: float = 310.0) -> float:
        """Attempt folding with given energy input. Returns new folding state."""
        # Energy landscape: folded state = native_energy, unfolded = 0
        # Probability of folding: Boltzmann factor
        delta_e = self.native_energy - energy_input
        if temperature > 0:
            p_fold = 1.0 / (1.0 + exp(delta_e / (BOLTZMANN * temperature * 6.022e23 / 1000)))
        else:
            p_fold = 1.0 if delta_e < 0 else 0.0

        self.folding_state = self.folding_state * 0.9 + p_fold * 0.1  # Smooth update
        return self.folding_state

    def apply_pulse(self, frequency: float, amplitude: float, temperature: float = 310.0) -> Dict:
        """Apply a resonant pulse to assist folding."""
        # Each protein has a resonant frequency (depends on size)
        resonant_freq = 350e12 / (self.sequence_length / 100)  # ~3.5 THz per 100 residues
        detuning = abs(frequency - resonant_freq) / resonant_freq

        # Energy absorbed = amplitude * resonance_factor
        resonance = max(0, 1 - detuning * 10)  # Peak at resonance
        energy = amplitude * resonance * PROTEIN_FOLDING_ENERGY * 1000 / 6.022e23  # Joules per molecule

        old_state = self.folding_state
        self.fold(energy, temperature)

        # Update damage
        if detuning > 0.5 and amplitude > 0.8:
            self.damage_score += 0.01 * amplitude * detuning  # Off-resonance damage

        # Update aggregation risk
        if self.folding_state < 0.3:
            self.aggregation_risk = min(1.0, self.aggregation_risk + 0.05)

        return {
            "protein": self.name,
            "folding_before": old_state,
            "folding_after": self.folding_state,
            "resonance": resonance,
            "energy_absorbed": energy,
            "damage": self.damage_score,
        }


class Chaperone:
    """Simulates chaperone protein (e.g., Hsp70) that assists folding."""

    def __init__(self, efficiency: float = 0.8, atp_per_fold: float = 1.0):
        self.efficiency = efficiency
        self.atp_per_fold = atp_per_fold
        self.atp_consumed = 0

    def assist_folding(self, protein: Protein, temperature: float = 310.0) -> float:
        """Use ATP to assist protein folding."""
        if protein.folding_state > 0.9:
            return protein.folding_state  # Already folded

        self.atp_consumed += self.atp_per_fold
        energy = self.efficiency * PROTEIN_FOLDING_ENERGY * 1000 / 6.022e23
        return protein.fold(energy, temperature)


@dataclass
class ProteostasisNetwork:
    """A network of proteins + chaperones under pulse control."""

    proteins: List[Protein] = field(default_factory=list)
    chaperones: List[Chaperone] = field(default_factory=list)
    temperature: float = 310.0  # Body temperature (K)

    @property
    def average_folding(self) -> float:
        if not self.proteins:
            return 1.0
        return sum(p.folding_state for p in self.proteins) / len(self.proteins)

    @property
    def average_damage(self) -> float:
        if not self.proteins:
            return 0.0
        return sum(p.damage_score for p in self.proteins) / len(self.proteins)

    @property
    def aggregation_index(self) -> float:
        if not self.proteins:
            return 0.0
        return sum(p.aggregation_risk for p in self.proteins) / len(self.proteins)

    def create_default_network(self, n_proteins: int = 100, n_chaperones: int = 10):
        """Create a default proteostasis network."""
        names = ["Hsp90", "Actin", "Tubulin", "Collagen", "Insulin", "Hemoglobin",
                 "Albumin", "Catalase", "SOD", "CytochromeC"]
        for i in range(n_proteins):
            self.proteins.append(Protein(
                name=f"{names[i % len(names)]}_{i}",
                sequence_length=np.random.randint(50, 500),
                native_energy=np.random.uniform(-50, -10),
                folding_state=np.random.uniform(0.7, 1.0),
            ))
        for i in range(n_chaperones):
            self.chaperones.append(Chaperone(
                efficiency=np.random.uniform(0.6, 0.95),
                atp_per_fold=np.random.uniform(0.5, 2.0),
            ))

    def apply_pulse_cascade(self, pulses: List, temperature: float = None) -> Dict:
        """Apply a cascade of pulses to the network."""
        T = temperature or self.temperature
        results = []
        for protein in self.proteins:
            for pulse in pulses[:3]:  # Top 3 pulses in cascade
                result = protein.apply_pulse(pulse.frequency, pulse.amplitude, T)
            results.append(result)

        # Run chaperones on any protein below 0.5 folding
        for protein in self.proteins:
            if protein.folding_state < 0.5:
                for chap in self.chaperones[:2]:
                    chap.assist_folding(protein, T)

        return {
            "proteins_treated": len(self.proteins),
            "avg_folding_before": sum(r["folding_before"] for r in results) / len(results),
            "avg_folding_after": self.average_folding,
            "avg_damage": self.average_damage,
            "aggregation_index": self.aggregation_index,
            "atp_consumed": sum(c.atp_consumed for c in self.chaperones),
        }
