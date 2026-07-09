from __future__ import annotations

import random
from dataclasses import dataclass
from enum import Enum, auto
from typing import Dict, Iterable, List, Tuple


class Phase(Enum):
    """Phases that mirror the hermeneutic clave SER-QUERER-SABER-OSAR-CALLAR."""

    SER = auto()
    QUERER = auto()
    SABER = auto()
    OSAR = auto()
    CALLAR = auto()


class Resource(Enum):
    """Families of hechizos described in the Ars Notoria index."""

    FIGURA = auto()
    NOTA = auto()
    ORACION_LENGUAS = auto()
    ORACION_MAESTRA = auto()
    OPERACION_VISION = auto()
    RITO_LUNAR = auto()
    UNIVERSAL = auto()


class SpeechAct(Enum):
    """Simplified linguistic roles for interlocution."""

    INVOCATION = auto()
    MANDATO = auto()
    REVELATION = auto()
    CONSULTA = auto()
    SELLO = auto()


@dataclass(frozen=True)
class HechizoState:
    """State vector consumed by the Q-learning policy."""

    phase: Phase
    resource: Resource
    gate_open: bool


@dataclass(frozen=True)
class RitualAction:
    """Actions available to the motor."""

    target_phase: Phase
    resource: Resource
    speech_act: SpeechAct


@dataclass
class RitualOutcome:
    """Container with the result of a ritual tick."""

    gate_open: bool
    state: HechizoState
    action: RitualAction | None
    reward: float
    narrative: str
    payoffs: Tuple[int, int] | None


class BinaryGate:
    """
    Forces the subject to input a binary trigger before the ritual may advance.

    The gate can be configured with any pair of symbols, but by default accepts 0/1.
    """

    def __init__(self, accepted: Iterable[int | str] = (0, 1)) -> None:
        self.accepted = tuple(str(v) for v in accepted)

    def open(self, value: int | str) -> bool:
        """Return True when the provided value matches the accepted binary set."""
        return str(value).strip() in self.accepted


class QLearningPolicy:
    """Minimal Q-learning implementation specialised for the hermeneutic motor."""

    def __init__(
        self,
        alpha: float = 0.4,
        gamma: float = 0.85,
        epsilon: float = 0.25,
    ) -> None:
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.q_table: Dict[Tuple[HechizoState, RitualAction], float] = {}

    def select(self, state: HechizoState, actions: List[RitualAction]) -> RitualAction:
        """Pick an action using epsilon-greedy exploration."""
        if not actions:
            raise ValueError("At least one action is required")

        if random.random() < self.epsilon:
            return random.choice(actions)

        def score(action: RitualAction) -> float:
            return self.q_table.get((state, action), 0.0)

        return max(actions, key=score)

    def update(
        self,
        state: HechizoState,
        action: RitualAction,
        reward: float,
        next_state: HechizoState,
        next_actions: List[RitualAction],
    ) -> None:
        """Standard Q-learning update."""
        old_q = self.q_table.get((state, action), 0.0)
        future = 0.0
        if next_actions:
            future = max(self.q_table.get((next_state, a), 0.0) for a in next_actions)
        new_q = old_q + self.alpha * (reward + self.gamma * future - old_q)
        self.q_table[(state, action)] = new_q


class HumanStrategy(Enum):
    """Simplified human responses."""

    COOPERATE = auto()
    RESIST = auto()
    NOISE = auto()


class MachineStrategy(Enum):
    """Machine reactions compatible with the sequential ritual."""

    ADVANCE = auto()
    REPEAT = auto()
    ABORT = auto()


PAYOFF_MATRIX: Dict[
    Tuple[HumanStrategy, MachineStrategy],
    Tuple[int, int],
] = {
    (HumanStrategy.COOPERATE, MachineStrategy.ADVANCE): (3, 3),
    (HumanStrategy.COOPERATE, MachineStrategy.REPEAT): (1, 2),
    (HumanStrategy.COOPERATE, MachineStrategy.ABORT): (0, -1),
    (HumanStrategy.RESIST, MachineStrategy.ADVANCE): (-2, -3),
    (HumanStrategy.RESIST, MachineStrategy.REPEAT): (0, -2),
    (HumanStrategy.RESIST, MachineStrategy.ABORT): (1, -1),
    (HumanStrategy.NOISE, MachineStrategy.ADVANCE): (-1, -2),
    (HumanStrategy.NOISE, MachineStrategy.REPEAT): (-1, -1),
    (HumanStrategy.NOISE, MachineStrategy.ABORT): (0, 0),
}


class HumanMachineGame:
    """Tiny sequential game enforcing accountability over the binary gate."""

    def best_reply(self, human: HumanStrategy) -> MachineStrategy:
        """Return the machine strategy that maximises its payoff given a human move."""
        options = {
            strat: PAYOFF_MATRIX[(human, strat)][1]
            for strat in MachineStrategy
        }
        return max(options, key=options.get)

    def play(
        self, human: HumanStrategy, machine: MachineStrategy | None = None
    ) -> Tuple[MachineStrategy, Tuple[int, int]]:
        """Resolve a single stage of the game."""
        if machine is None:
            machine = self.best_reply(human)
        payoff = PAYOFF_MATRIX[(human, machine)]
        return machine, payoff


class NotoriaMotor:
    """
    Motor hermeneutico que concatena Q-learning y juego humano-maquina.

    Usage:
        >>> motor = NotoriaMotor()
        >>> outcome = motor.tick(binary_input=1, human_strategy=HumanStrategy.COOPERATE)
    """

    PHASE_ORDER = [
        Phase.SER,
        Phase.QUERER,
        Phase.SABER,
        Phase.OSAR,
        Phase.CALLAR,
    ]

    RESOURCE_CYCLE = [
        Resource.FIGURA,
        Resource.NOTA,
        Resource.ORACION_LENGUAS,
        Resource.ORACION_MAESTRA,
        Resource.OPERACION_VISION,
        Resource.RITO_LUNAR,
        Resource.UNIVERSAL,
    ]

    def __init__(self) -> None:
        self.gate = BinaryGate()
        self.policy = QLearningPolicy()
        self.game = HumanMachineGame()
        self.phase_index = 0
        self.resource_index = 0
        self.state = HechizoState(
            phase=self.PHASE_ORDER[self.phase_index],
            resource=self.RESOURCE_CYCLE[self.resource_index],
            gate_open=False,
        )

    def available_actions(self, state: HechizoState) -> List[RitualAction]:
        """Return the catalogue of actions reachable from the current state."""
        phase_pos = self.PHASE_ORDER.index(state.phase)
        next_phase = self.PHASE_ORDER[min(phase_pos + 1, len(self.PHASE_ORDER) - 1)]
        return [
            RitualAction(next_phase, Resource.FIGURA, SpeechAct.INVOCATION),
            RitualAction(next_phase, Resource.NOTA, SpeechAct.MANDATO),
            RitualAction(next_phase, Resource.ORACION_MAESTRA, SpeechAct.REVELATION),
            RitualAction(state.phase, Resource.RITO_LUNAR, SpeechAct.CONSULTA),
            RitualAction(Phase.CALLAR, Resource.UNIVERSAL, SpeechAct.SELLO),
        ]

    def _advance_state(
        self, action: RitualAction | None, gate_open: bool
    ) -> HechizoState:
        if gate_open and action:
            self.phase_index = self.PHASE_ORDER.index(action.target_phase)
            self.resource_index = self.RESOURCE_CYCLE.index(action.resource)
        resource = self.RESOURCE_CYCLE[self.resource_index]
        phase = self.PHASE_ORDER[self.phase_index]
        return HechizoState(phase=phase, resource=resource, gate_open=gate_open)

    def _narrate(self, state: HechizoState, action: RitualAction | None, gate: bool) -> str:
        if not gate:
            return "El sujeto rechazo el binario. El hechizo queda suspendido."
        if action is None:
            return "La maquina observa, pero ningun acto fue seleccionado."
        return (
            f"Fase {state.phase.name} invoca {action.resource.name} via {action.speech_act.name}."
        )

    def tick(
        self,
        binary_input: int | str,
        human_strategy: HumanStrategy,
        force_machine: MachineStrategy | None = None,
    ) -> RitualOutcome:
        """
        Run a single iteration of the motor.

        The binary gate must be satisfied before any state transition happens.
        """
        gate_open = self.gate.open(binary_input)
        state = HechizoState(
            phase=self.state.phase,
            resource=self.state.resource,
            gate_open=gate_open,
        )
        actions = self.available_actions(state) if gate_open else []
        action = self.policy.select(state, actions) if actions else None

        reward = 0.0
        next_state: HechizoState
        if gate_open and action:
            reward = 1.0 if action.target_phase != Phase.CALLAR else 2.0
            next_state = self._advance_state(action, gate_open=True)
            next_actions = self.available_actions(next_state)
            self.policy.update(state, action, reward, next_state, next_actions)
            self.state = next_state
        else:
            next_state = self._advance_state(action, gate_open=False)
            self.state = next_state

        machine_choice, payoffs = self.game.play(human_strategy, force_machine)
        narrative = self._narrate(next_state, action, gate_open)

        return RitualOutcome(
            gate_open=gate_open,
            state=next_state,
            action=action,
            reward=reward,
            narrative=f"{narrative} Juego: {human_strategy.name}/{machine_choice.name}.",
            payoffs=payoffs,
        )


__all__ = [
    "BinaryGate",
    "HumanMachineGame",
    "HumanStrategy",
    "MachineStrategy",
    "NotoriaMotor",
    "Phase",
    "QLearningPolicy",
    "RitualOutcome",
    "RitualAction",
    "Resource",
    "SpeechAct",
]
