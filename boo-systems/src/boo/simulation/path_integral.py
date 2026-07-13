#!/usr/bin/env python3
"""
Boo Path Integrals — Feynman Path Simulation (#022)
═══════════════════════════════════════════════════
BELL 13450.50 | Simulates all possible paths for system evolution.
Uses Monte Carlo path sampling to find most probable trajectories.
"""

import numpy as np
from math import pi, exp, sqrt, cos, sin
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Callable
from ..constants import PLANCK_REDUCED


@dataclass
class PathPoint:
    """A point in configuration space."""
    position: float
    velocity: float
    time: float
    action: float = 0.0


@dataclass
class Path:
    """A single Feynman path through configuration space."""
    points: List[PathPoint] = field(default_factory=list)
    total_action: float = 0.0
    probability_amplitude: complex = 1.0 + 0j
    weight: float = 1.0  # Importance sampling weight

    @property
    def probability(self) -> float:
        """Classical probability = |ψ|²."""
        return abs(self.probability_amplitude)**2

    @property
    def start(self) -> PathPoint:
        return self.points[0] if self.points else None

    @property
    def end(self) -> PathPoint:
        return self.points[-1] if self.points else None


class PathIntegralSimulator:
    """
    Monte Carlo path integral simulator.
    Samples paths according to exp(i·S/ħ) weight,
    finds the path of maximum probability (classical limit).
    """

    def __init__(self, hbar: float = PLANCK_REDUCED):
        self.hbar = hbar
        self.paths: List[Path] = []
        self.most_probable: Path = None

    def lagrangian(self, position: float, velocity: float, time: float,
                   potential_fn: Callable = None) -> float:
        """
        Basic Lagrangian L = T - V.
        Override potential_fn for specific systems.
        """
        # Kinetic energy: T = ½mv² (assume m=1)
        kinetic = 0.5 * velocity**2

        # Potential: harmonic oscillator V = ½ω²x² (default)
        omega = 2 * pi  # natural frequency
        potential = 0.5 * omega**2 * position**2 if potential_fn is None else potential_fn(position, time)

        return kinetic - potential

    def action(self, path: Path, potential_fn: Callable = None) -> float:
        """Calculate action S = ∫L·dt for a path (trapezoidal integration)."""
        total = 0.0
        for i in range(len(path.points) - 1):
            p0, p1 = path.points[i], path.points[i + 1]
            dt = p1.time - p0.time
            if dt <= 0:
                continue
            # Velocity between points
            v = (p1.position - p0.position) / dt
            L0 = self.lagrangian(p0.position, v, p0.time, potential_fn)
            L1 = self.lagrangian(p1.position, v, p1.time, potential_fn)
            total += 0.5 * (L0 + L1) * dt  # Trapezoidal
        return total

    def generate_random_path(self, start_pos: float, end_pos: float,
                             total_time: float, n_steps: int = 100,
                             std_dev: float = 0.1) -> Path:
        """Generate a random path between start and end positions."""
        path = Path()
        dt = total_time / n_steps

        # Brownian bridge: start at start_pos, end at end_pos
        path.points.append(PathPoint(position=start_pos, velocity=0, time=0))

        for i in range(1, n_steps):
            t = i * dt
            # Drift toward endpoint + random noise
            drift = (end_pos - start_pos) / total_time * t
            noise = np.random.normal(0, std_dev * sqrt(dt))
            pos = start_pos + drift + noise
            vel = (pos - path.points[-1].position) / dt
            path.points.append(PathPoint(position=pos, velocity=vel, time=t))

        path.points.append(PathPoint(position=end_pos, velocity=0, time=total_time))

        # Calculate action
        path.total_action = self.action(path)

        # Probability amplitude ∝ exp(i·S/ħ)
        path.probability_amplitude = complex(cos(path.total_action / self.hbar),
                                             sin(path.total_action / self.hbar))
        return path

    def monte_carlo_sample(self, start_pos: float, end_pos: float,
                           total_time: float, n_paths: int = 1000,
                           n_steps: int = 100) -> Dict:
        """Monte Carlo path sampling — find most probable trajectories."""
        self.paths = []

        # Generate paths
        for _ in range(n_paths):
            path = self.generate_random_path(start_pos, end_pos, total_time, n_steps,
                                             std_dev=0.1 * sqrt(total_time))
            self.paths.append(path)

        # Find most probable (classical) path = minimum action
        self.paths.sort(key=lambda p: p.total_action)
        self.most_probable = self.paths[0]

        # Statistics
        actions = [p.total_action for p in self.paths]
        probs = [p.probability for p in self.paths]

        return {
            "n_paths": n_paths,
            "n_steps": n_steps,
            "total_time": total_time,
            "most_probable_action": self.most_probable.total_action,
            "classical_probability": self.most_probable.probability,
            "mean_action": np.mean(actions),
            "std_action": np.std(actions),
            "min_action": min(actions),
            "action_variance": np.var(actions),
            "semiclassical_parameter": PLANCK_REDUCED / abs(self.most_probable.total_action) if self.most_probable.total_action != 0 else float('inf'),
        }

    def most_probable_trajectory(self) -> List[Tuple[float, float]]:
        """Return (time, position) for the most probable path."""
        if not self.most_probable:
            return []
        return [(p.time, p.position) for p in self.most_probable.points]

    def probability_cloud(self, time_slice: float) -> Dict:
        """Get position distribution at a given time slice."""
        positions = []
        for path in self.paths:
            # Find closest point to time_slice
            for p in path.points:
                if abs(p.time - time_slice) < 1e-6:
                    positions.append(p.position)
                    break

        if not positions:
            return {"time": time_slice, "positions": [], "mean": 0, "std": 0}

        return {
            "time": time_slice,
            "mean_position": np.mean(positions),
            "std_position": np.std(positions),
            "min_position": min(positions),
            "max_position": max(positions),
        }
