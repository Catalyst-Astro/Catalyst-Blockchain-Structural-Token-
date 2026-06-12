from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

from arke.gpt_oss_adapter import GPTOSSAdapter
from arke.arke_orquestador import interfaz_consciente

try:
    from api.warroom import router as warroom_router
except ModuleNotFoundError:  # pragma: no cover - running via `python api/main.py`
    import sys

    sys.path.append(str(Path(__file__).resolve().parent.parent))
    try:
        from api.warroom import router as warroom_router  # type: ignore
    except ModuleNotFoundError:
        warroom_router = None  # type: ignore[assignment]


class Prompt(BaseModel):
    mensaje: str
    tono: str | None = None


app = FastAPI(title="Arke API", version="0.1.0")
_adapter = GPTOSSAdapter()
if warroom_router is not None:
    app.include_router(warroom_router)


@app.post("/arke/generar")
async def generar_respuesta(prompt: Prompt) -> dict[str, str | None]:
    tokens = prompt.mensaje.split()
    generado = await _adapter.generate(tokens)
    filtro = interfaz_consciente(generado)
    if "Decisión bloqueada" in filtro:
        respuesta = filtro
    else:
        respuesta = generado
    return {"respuesta": respuesta, "tono": prompt.tono}


# Intenta incluir router de arke.api si existe, sin romper arranque
try:
    from arke.api import router as arke_router  # type: ignore
    app.include_router(arke_router, prefix="/api")
except Exception:
    pass


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

