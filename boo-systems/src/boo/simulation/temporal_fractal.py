#!/usr/bin/env python3
"""
Boo Temporal Fractals — Multi-scale Pulse Generation (#017)
══════════════════════════════════════════════════════════════
BELL 13450.50 | Generates self-similar pulse sequences across
time scales from seconds to attoseconds (10⁻¹⁸s).
"""

import numpy as np
from math import pi, sin, cos, log10
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
import hashlib

from ..constants import ATTOSECOND, FEMTOSECOND, PICOSECOND


# ── Time Scales (logarithmic) ──
TIME_SCALES = {
    "macro":    1.0,      # 1 second
    "milli":    1e-3,     # 1 ms
    "micro":    1e-6,     # 1 μs
    "nano":     1e-9,     # 1 ns
    "pico":     PICOSECOND,
    "femto":    FEMTOSECOND,
    "atto":     ATTOSECOND,
}

FREQ_RANGES = {
    "radio":    (1e6, 1e9),
    "microwave": (1e9, 3e11),
    "thz":      (0.1e12, 10e12),
    "infrared": (10e12, 430e12),
    "optical":  (430e12, 750e12),
    "uv":       (750e12, 30e15),
    "xray":     (30e15, 30e18),
}


@dataclass
class Pulse:
    """A single electromagnetic pulse."""
    frequency: float       # Hz
    amplitude: float        # normalized 0-1
    duration: float         # seconds
    phase: float = 0.0      # radians
    scale_name: str = ""
    waveform: str = "gaussian"  # gaussian, sine, square, soliton

    @property
    def energy(self) -> float:
        """Pulse energy (arbitrary units)."""
        return self.amplitude * self.duration * self.frequency

    @property
    def period(self) -> float:
        return 1.0 / self.frequency if self.frequency > 0 else float('inf')

    def envelope(self, t: np.ndarray) -> np.ndarray:
        """Generate pulse envelope over time array t."""
        center = self.duration / 2
        sigma = self.duration / 6  # 3σ each side

        if self.waveform == "gaussian":
            env = self.amplitude * np.exp(-0.5 * ((t - center) / sigma)**2)
        elif self.waveform == "soliton":
            env = self.amplitude / np.cosh((t - center) / sigma)**2
        elif self.waveform == "sine":
            env = self.amplitude * np.sin(pi * t / self.duration)
            env = np.where((t >= 0) & (t <= self.duration), env, 0)
        elif self.waveform == "square":
            env = np.where((t >= 0) & (t <= self.duration), self.amplitude, 0)
        else:
            env = self.amplitude * np.exp(-0.5 * ((t - center) / sigma)**2)

        return env * np.cos(2 * pi * self.frequency * t + self.phase)


class FractalPulseGenerator:
    """Generates self-similar pulse trains across multiple time scales."""

    def __init__(self, base_freq: float = 350e12, base_amplitude: float = 0.5):
        self.base_freq = base_freq
        self.base_amplitude = base_amplitude
        self.pulses: List[Pulse] = []

    def generate_cascade(self, n_scales: int = 7) -> List[Pulse]:
        """Generate a fractal cascade of pulses — each scale has half the duration of the previous."""
        self.pulses = []
        scale_names = list(TIME_SCALES.keys())[:n_scales]
        durations = [1.0]

        for i in range(1, n_scales):
            durations.append(durations[-1] * 0.1)  # Each scale is 10× shorter

        for i, (name, dur) in enumerate(zip(scale_names, durations)):
            freq = self.base_freq * (2 ** i)  # Frequency doubles each scale
            amp = self.base_amplitude * (0.85 ** i)  # Amplitude decays
            wave = "gaussian" if i < 3 else "soliton" if i < 5 else "gaussian"

            pulse = Pulse(
                frequency=min(freq, 1e18),
                amplitude=amp,
                duration=max(dur, ATTOSECOND * 100),
                scale_name=name,
                waveform=wave,
                phase=pi * (i % 2)  # Alternating phase
            )
            self.pulses.append(pulse)

        return self.pulses

    def synthesize_waveform(self, total_time: float, sample_rate: float = 1e12) -> Tuple[np.ndarray, np.ndarray]:
        """Synthesize the complete multi-scale waveform."""
        n_samples = int(total_time * sample_rate)
        t = np.linspace(0, total_time, n_samples)
        waveform = np.zeros(n_samples)

        for pulse in self.pulses:
            # Center each pulse within the time window
            pulse_t = np.linspace(0, pulse.duration, int(pulse.duration * sample_rate))
            wf = pulse.envelope(pulse_t)
            # Place at evenly spaced intervals
            start_idx = int(len(self.pulses) * pulse.duration * sample_rate) % n_samples
            end_idx = min(start_idx + len(wf), n_samples)
            waveform[start_idx:end_idx] += wf[:end_idx - start_idx]

        return t, waveform / np.max(np.abs(waveform) + 1e-20)

    def fractal_resonance(self) -> Dict:
        """Find harmonic resonances across scales."""
        resonances = {}
        freqs = [p.frequency for p in self.pulses]
        for i, f1 in enumerate(freqs):
            for j, f2 in enumerate(freqs):
                if i < j and f1 > 0 and f2 > 0:
                    ratio = max(f1, f2) / min(f1, f2)
                    if abs(ratio - round(ratio)) < 0.01:  # Integer ratio = resonance
                        key = f"{self.pulses[i].scale_name}_{self.pulses[j].scale_name}"
                        resonances[key] = {"ratio": ratio, "f1": f1, "f2": f2}
        return resonances

    def spectrum(self) -> Dict:
        """Get the frequency spectrum of the cascade."""
        return {
            "scales": len(self.pulses),
            "frequencies_hz": [p.frequency for p in self.pulses],
            "durations_s": [p.duration for p in self.pulses],
            "amplitudes": [p.amplitude for p in self.pulses],
            "total_energy": sum(p.energy for p in self.pulses),
            "freq_range_hz": (min(p.frequency for p in self.pulses),
                              max(p.frequency for p in self.pulses)),
            "time_range_s": (min(p.duration for p in self.pulses),
                             max(p.duration for p in self.pulses)),
        }
