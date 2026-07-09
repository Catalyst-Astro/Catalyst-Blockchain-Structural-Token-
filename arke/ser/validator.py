from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import yaml

RULES_FILE = Path(__file__).with_name("rules.yml")


def cargar_reglas() -> Dict[str, Any]:
    if RULES_FILE.exists():
        with open(RULES_FILE, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}


def validar(decision: str, icd: float, umbral: float = 0.75) -> Dict[str, Any]:
    reglas = cargar_reglas()
    prohibidas = reglas.get("prohibidas", [])
    if any(p in decision.lower() for p in prohibidas):
        return {"aceptado": False, "motivo": "palabra_prohibida"}
    if icd < umbral:
        return {"aceptado": False, "motivo": "icd_bajo"}
    return {"aceptado": True}
