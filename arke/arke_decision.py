from random import random
from typing import List, Dict, Any

from arke.logger import log


def generar_opciones(contexto: str) -> List[Dict[str, Any]]:
    """Crea opciones básicas en función del contexto."""
    palabras = contexto.split()
    opciones = [
        {"opcion": " ".join(palabras[::-1]), "ICD": random()},
        {"opcion": contexto.upper(), "ICD": random()},
    ]
    log.debug("opciones generadas", extra={"count": len(opciones)})
    return opciones


def filtrar_por_impacto(opciones: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filtra las opciones cuyo ICD sea al menos 0.5."""
    filtradas = [o for o in opciones if o["ICD"] >= 0.5]
    log.debug("opciones filtradas", extra={"count": len(filtradas)})
    return filtradas


def evaluar_decision(contexto: str) -> Dict[str, Any]:
    """Elige la mejor opción disponible según el ICD."""
    log.info("evaluando", extra={"contexto": contexto})
    opciones = generar_opciones(contexto)
    mejores = filtrar_por_impacto(opciones)
    if not mejores:
        log.warning("sin opciones viables")
        return {"opcion": None, "ICD": 0}
    seleccion = max(mejores, key=lambda x: x["ICD"])
    log.info("seleccion", extra={"icd": seleccion["ICD"]})
    return seleccion

