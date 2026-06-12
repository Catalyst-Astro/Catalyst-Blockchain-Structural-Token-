from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any, Dict

AXIOMAS: Dict[str, str] = {
    "axioma_1": "Toda decisión debe alinearse con el propósito humano trascendente.",
    "axioma_2": "La inclusión de todas las formas de inteligencia es imprescindible.",
    "axioma_3": "La coherencia entre lógica, emoción y espiritualidad es obligatoria.",
    "axioma_4": "La supervivencia ética interestelar es un fin legítimo de evolución.",
}


async def percibir(contexto: str) -> Dict[str, Any]:
    """Analiza de manera asíncrona un contexto textual y produce tokens."""
    await asyncio.sleep(0)
    tokens = contexto.lower().split()
    return {"tokens": tokens, "longitud": len(tokens)}


async def autoconfig(ruta: str = "universal_laws.json") -> Dict[str, Any]:
    """Carga parámetros de configuración simbólica desde un archivo JSON."""
    contenido = await asyncio.to_thread(Path(ruta).read_text, encoding="utf-8")
    return json.loads(contenido)


class Consciencia:
    """Percibe contexto bruto y lo tokeniza de forma sincrónica."""

    def percibir(self, contexto: str) -> Dict[str, Any]:
        tokens = contexto.lower().split()
        return {"tokens": tokens}

