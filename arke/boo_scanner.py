from __future__ import annotations

from dataclasses import dataclass
from math import log2
from typing import Any, Callable, Dict, List


ModuleHandler = Callable[[dict[str, Any], str], dict[str, Any]]


@dataclass
class BooModule:
    name: str
    tags: tuple[str, ...]
    base_weight: float
    handler: ModuleHandler


class BooScanner:
    """Selecciona modulos optimos segun consulta y contexto.

    Complejidad:
    - Seleccion de modulos: O(n * t), n=modulos, t=tags por modulo.
    - Colapso de escenarios: O(s), s=escenarios.
    """

    def __init__(self, modules: list[BooModule], threshold: float = 0.4, top_k: int = 4) -> None:
        self.modules = modules
        self.threshold = threshold
        self.top_k = top_k

    def _score(self, text: str, module: BooModule) -> float:
        tokens = set(text.lower().split())
        overlap = sum(1 for tag in module.tags if tag in tokens)
        return (overlap + 1) * module.base_weight

    def select_modules(self, consulta: str) -> list[BooModule]:
        ranked = sorted(
            self.modules,
            key=lambda module: self._score(consulta, module),
            reverse=True,
        )
        selected = [m for m in ranked if self._score(consulta, m) > self.threshold][: self.top_k]
        if len(selected) < 2:
            selected = ranked[: min(2, len(ranked))]
        return selected

    def estimate_internal_entropy(self, relevancias: list[float]) -> float:
        total = sum(relevancias)
        if total <= 0:
            return 0.0
        probs = [score / total for score in relevancias if score > 0]
        entropy = -sum(p * log2(p) for p in probs)
        return round(entropy, 4)

    def collapse(self, escenarios: list[dict[str, Any]], icd: float) -> dict[str, Any]:
        if not escenarios:
            return {"escenario": None, "vt": 0.0, "idt": round(0.6 * icd, 3)}

        best = max(escenarios, key=lambda esc: float(esc.get("probabilidad", 0.0)))
        vt = float(best.get("probabilidad", 0.0))
        idt = round((0.6 * float(icd)) + (0.4 * vt), 3)
        return {"escenario": best, "vt": round(vt, 3), "idt": idt}
