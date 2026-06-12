from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, List, Sequence

from pydantic import BaseModel

from .gpt_oss_adapter import GPTOSSAdapter
from .logger import log


class CognitiveInput(BaseModel):
    """Data container for cognitive processing."""

    text: str


class CognitiveStrategy(ABC):
    """Base strategy for MBTI cognitive functions."""

    name: str

    @abstractmethod
    async def process(self, data: CognitiveInput) -> str:
        raise NotImplementedError


class TiStrategy(CognitiveStrategy):
    name = "Ti"

    async def process(self, data: CognitiveInput) -> str:
        return f"[TI] Analisis lógico de '{data.text}'"


class NeStrategy(CognitiveStrategy):
    name = "Ne"

    async def process(self, data: CognitiveInput) -> str:
        return f"[NE] Exploración de ideas sobre '{data.text}'"


class FiStrategy(CognitiveStrategy):
    name = "Fi"

    async def process(self, data: CognitiveInput) -> str:
        return f"[FI] Evaluación ética de '{data.text}'"


class SeStrategy(CognitiveStrategy):
    name = "Se"

    async def process(self, data: CognitiveInput) -> str:
        return f"[SE] Conexión sensorial con '{data.text}'"


async def ti_process(data: str) -> str:
    return await TiStrategy().process(CognitiveInput(text=data))


async def ne_process(data: str) -> str:
    return await NeStrategy().process(CognitiveInput(text=data))


async def fi_process(data: str) -> str:
    return await FiStrategy().process(CognitiveInput(text=data))


async def se_process(data: str) -> str:
    return await SeStrategy().process(CognitiveInput(text=data))


class MBTICore:
    """Asynchronous engine that applies MBTI strategies in sequence."""

    def __init__(self, strategies: List[CognitiveStrategy] | None = None) -> None:
        self.strategies = strategies or [NeStrategy(), TiStrategy(), FiStrategy(), SeStrategy()]

    async def run(self, data: str | CognitiveInput) -> List[str]:
        if isinstance(data, str):
            data = CognitiveInput(text=data)
        results: List[str] = []
        for strat in self.strategies:
            log.debug("cognitive step", extra={"strategy": strat.name})
            results.append(await strat.process(data))
        return results


class Cognicion:
    """Genera insights usando GPT-OSS-20B con respaldo heurístico."""

    def __init__(self, engine: GPTOSSAdapter | None = None) -> None:
        self.engine = engine or GPTOSSAdapter()

    async def generar_insight(self, contexto: Dict[str, Sequence[str]]) -> Dict[str, str]:
        tokens = contexto.get("tokens", [])
        if not tokens:
            return {"estrategia": "fallback", "insight": ""}
        try:
            insight = await self.engine.generate(tokens)
            estrategia = "gpt-oss-20b"
        except Exception as exc:  # pragma: no cover - fallback defensivo
            log.warning("cognicion_fallback", extra={"error": str(exc)})
            insight = " ".join(reversed(tokens))
            estrategia = "fallback"
        return {"estrategia": estrategia, "insight": insight}

