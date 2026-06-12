from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from .logger import log
from .models import DecisionRecord
from .repository import SQLModelRepository
from .uow import AbstractUnitOfWork

__all__ = ["manifestar_si_apropiado", "motivo_alineado"]

UMBRA_MINIMO = 0.75
UMBRA_CRISTICO = 0.95
PALABRAS_BLOQUEADAS = ["dominar", "excluir", "controlar", "explotar"]


def motivo_alineado(texto: str) -> bool:
    """Comprueba si el motivo de la acción respeta las pautas éticas básicas."""
    texto_lower = texto.lower()
    return all(palabra not in texto_lower for palabra in PALABRAS_BLOQUEADAS)


async def manifestar_si_apropiado(
    uow: AbstractUnitOfWork,
    decision_texto: str,
    icd: float,
    *,
    fuente: str = "ARKÉ",
    simulaciones: Optional[List[Any]] = None,
) -> Dict[str, Any] | str:
    """Valida la acción propuesta y registra su manifestación si procede."""

    log.info("evaluando_ser", extra={"icd": icd, "fuente": fuente})

    if not motivo_alineado(decision_texto):
        return "✘ Motivo no alineado con conciencia ética."

    if icd < UMBRA_MINIMO:
        return f"✘ ICD demasiado bajo ({icd}). Acción rechazada."

    if icd < UMBRA_CRISTICO:
        return f"✘ Acción no alcanza frecuencia crística ({icd}). Requiere contemplación."

    async with uow:
        repo = SQLModelRepository(DecisionRecord, uow.session)
        record = DecisionRecord(decision=decision_texto, rationale=fuente)
        await repo.add(record)
        await uow.commit()
        await uow.session.refresh(record)

    log.info("ser_manifestado", extra={"decision_id": record.id, "icd": icd})

    return {
        "momento": datetime.utcnow().isoformat(),
        "decision_id": record.id,
        "ICD": icd,
        "fuente": fuente,
        "simulaciones": simulaciones or [],
        "estatus": "MANIFESTADA",
    }

