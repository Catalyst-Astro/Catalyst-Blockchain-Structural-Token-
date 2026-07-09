from __future__ import annotations

import base64
import io
import json
import os
import zipfile
from typing import Any, Dict, Optional
from uuid import uuid4

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, update

from .audit import AuditLedger
from .cache import get_cache
from .deps import get_uow
from .icd import ContextoEvaluacion, calcular_icd
from .models import DecisionRecord, TelemetryRaw
from .orchestrator import Orquestador
from .repository import SQLModelRepository
from .uow import SQLAlchemyAsyncUoW


router = APIRouter(prefix="/v1", tags=["arke"])


class DecisionInput(BaseModel):
    """Payload principal para el orquestador simbólico."""

    contexto: str


class ICDRequest(BaseModel):
    """Solicita un cálculo explícito del ICD."""

    actor: str = Field(..., min_length=1)
    intencion: str = Field(..., min_length=1)
    impacto_ambiental: float = Field(..., ge=-1.0, le=1.0)
    impacto_social: float = Field(..., ge=-1.0, le=1.0)
    riesgo: float = Field(default=0.0, ge=0.0, le=1.0)
    insights: list[str] = Field(default_factory=list)
    edad: Optional[int] = Field(default=None, ge=0, le=130)
    sintomas: Optional[Dict[str, float]] = None
    factores: Optional[Dict[str, float]] = None


class ICDResponse(BaseModel):
    icd: float


class TelemetryInput(BaseModel):
    """Carga simple de telemetría sincrónica."""

    payload: Dict[str, Any]
    actor_id: Optional[int] = None


class TelemetryAck(BaseModel):
    status: str = "ok"
    accepted: bool = True


@router.post("/decision", summary="Procesa una decisión a través del orquestador")
async def procesar_decision(
    data: DecisionInput,
    uow: SQLAlchemyAsyncUoW = Depends(get_uow),
) -> Dict[str, Any]:
    orq = Orquestador()
    return await orq.procesar(data.contexto, uow=uow)


@router.post("/decision/icd", response_model=ICDResponse, summary="Calcula el Índice de Coherencia Decisional")
async def calcular_indice(req: ICDRequest) -> ICDResponse:
    ctx = ContextoEvaluacion(**req.model_dump())
    score = calcular_icd(ctx)
    return ICDResponse(icd=score)


@router.post("/telemetry/ingest", response_model=TelemetryAck, summary="Registra telemetría bruta")
async def ingest_telemetry(
    data: TelemetryInput,
    uow: SQLAlchemyAsyncUoW = Depends(get_uow),
) -> TelemetryAck:
    if not data.payload:
        return TelemetryAck(accepted=False)

    repo = SQLModelRepository(TelemetryRaw, uow.session)
    telemetry = TelemetryRaw(actor_id=data.actor_id, payload=data.payload)
    await repo.add(telemetry)
    await uow.commit()
    return TelemetryAck()


@router.get("/decision/{decision_id}", summary="Explica una decisión almacenada")
async def explain_decision(
    decision_id: int,
    uow: SQLAlchemyAsyncUoW = Depends(get_uow),
    cache=Depends(get_cache),
) -> Dict[str, Any]:
    cache_key = f"decision:{decision_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    repo = SQLModelRepository(DecisionRecord, uow.session)
    record = await repo.get(decision_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Decision not found")

    result = {
        "id": record.id,
        "decision": record.decision,
        "rationale": record.rationale,
    }
    await cache.set(cache_key, result)
    return result


@router.post("/gdpr/forget/{actor}", summary="Anonimiza datos asociados a un actor")
async def forget_data(actor: int, uow: SQLAlchemyAsyncUoW = Depends(get_uow)) -> JSONResponse:
    ledger = AuditLedger()
    await uow.session.exec(
        update(DecisionRecord)
        .where(DecisionRecord.entity_id == actor)
        .values(decision=None, rationale=None)
    )
    await uow.session.exec(
        update(TelemetryRaw)
        .where(TelemetryRaw.actor_id == actor)
        .values(payload=None)
    )
    await uow.commit()

    ledger.append("forget", {"actor": actor})
    job_id = str(uuid4())
    return JSONResponse({"job_id": job_id})


@router.get("/actors/{actor}/export", summary="Exporta decisiones y telemetría cifradas")
async def export_data(actor: int, uow: SQLAlchemyAsyncUoW = Depends(get_uow)) -> Dict[str, str]:
    ledger = AuditLedger()
    decisions = (
        await uow.session.exec(
            select(DecisionRecord).where(DecisionRecord.entity_id == actor)
        )
    ).all()
    telemetry = (
        await uow.session.exec(
            select(TelemetryRaw).where(TelemetryRaw.actor_id == actor)
        )
    ).all()

    payload = {
        "decisions": [d.model_dump() for d in decisions],
        "telemetry": [t.model_dump() for t in telemetry],
    }

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("data.json", json.dumps(payload).encode())

    key = AESGCM.generate_key(bit_length=256)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    cipher = aesgcm.encrypt(nonce, buffer.getvalue(), None)

    ledger.append("export", {"actor": actor, "count": len(payload["decisions"]) + len(payload["telemetry"])})

    return {
        "key": base64.b64encode(key).decode(),
        "data": base64.b64encode(nonce + cipher).decode(),
    }

