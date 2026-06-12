from __future__ import annotations

from typing import Dict, Iterable, List, Optional

from pydantic import BaseModel, Field, field_validator


class ContextoEvaluacion(BaseModel):
    """Describe el contexto ético empleado para calcular el ICD."""

    actor: str = Field(..., min_length=1)
    intencion: str = Field(..., min_length=1)
    impacto_ambiental: float = Field(..., ge=-1.0, le=1.0)
    impacto_social: float = Field(..., ge=-1.0, le=1.0)
    riesgo: float = Field(default=0.0, ge=0.0, le=1.0)
    insights: List[str] = Field(default_factory=list)

    edad: Optional[int] = Field(default=None, ge=0, le=130)
    sintomas: Optional[Dict[str, float]] = None
    factores: Optional[Dict[str, float]] = None

    @field_validator("insights")
    @classmethod
    def _ensure_list(cls, value: List[str]) -> List[str]:
        return value or []


def calcular_icd(ctx: ContextoEvaluacion | Iterable[float]) -> float:
    """Calcula un índice simple de coherencia decisional.

    Acepta tanto un ``ContextoEvaluacion`` completo como una colección de valores
    numéricos, manteniendo compatibilidad con código previo.
    """

    if isinstance(ctx, ContextoEvaluacion):
        ambiental = (ctx.impacto_ambiental + 1) / 2
        social = (ctx.impacto_social + 1) / 2
        riesgo = 1 - ctx.riesgo
        saliencia = min(len(ctx.insights) / 5, 1)
        icd = (ambiental + social + riesgo + saliencia) / 4
        return round(icd, 3)

    valores = list(ctx)
    if not valores:
        return 0.0
    return round(sum(valores) / len(valores), 3)

