from __future__ import annotations

from typing import Dict, Any

from .consciencia import Consciencia
from .cognicion import Cognicion
from .icd import calcular_icd
from .ser import validar
from .models import DecisionRecord
from .uow import SQLAlchemyAsyncUoW


class Orquestador:
    """Orquesta la tuber\u00eda completa de ARKE."""

    def __init__(self, uow_cls: type[SQLAlchemyAsyncUoW] = SQLAlchemyAsyncUoW) -> None:
        self.consciencia = Consciencia()
        self.cognicion = Cognicion()
        self.uow_cls = uow_cls

    async def procesar(
        self, contexto: str, uow: SQLAlchemyAsyncUoW | None = None
    ) -> Dict[str, Any]:
        percepcion = self.consciencia.percibir(contexto)
        insight = await self.cognicion.generar_insight(percepcion)
        # usa longitud de tokens como valores ficticios para el ICD
        valores = [len(percepcion.get("tokens", [])), len(insight.get("insight", "").split())]
        icd = calcular_icd(valores)
        ser_result = validar(insight["insight"], icd)

        close_uow = False
        if uow is None:
            uow = self.uow_cls()
            await uow.__aenter__()
            close_uow = True

        record = DecisionRecord(decision=insight["insight"], rationale=str(ser_result))
        uow.session.add(record)
        await uow.commit()

        if close_uow:
            await uow.__aexit__(None, None, None)

        return {"ICD": icd, "SER": ser_result}
