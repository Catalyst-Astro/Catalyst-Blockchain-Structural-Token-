"""Simulacion simplificada de consenso Proof-of-Authority con logica simbolica.

Este modulo define validadores y un mecanismo PoA que toma en cuenta
principios eticos o simbolicos para aprobar bloques.

Ejemplo de uso:
>>> from consensus.symbolic_consensus import ConsensusPoA, ValidadorSimbolico
>>> poa = ConsensusPoA()
>>> val = ValidadorSimbolico(node_id="abcd", arquetipo="solar",
... principios=["energia"], ciclo_activo=True)
>>> poa.registrar_validador(val)
>>> bloque = {"datos": "demo", "tipo": "solar", "principio": "energia"}
>>> elegido = poa.seleccionar_validador(0)
>>> if poa.validar_bloque(bloque, elegido):
...     poa.actualizar_reputacion(elegido, True)
"""

import json
import hashlib
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path


LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
VALIDADORES_PATH = Path(__file__).resolve().parent / "validadores.json"


@dataclass
class ValidadorSimbolico:
    """Entidad autorizada para validar bloques en base a principios."""

    node_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    arquetipo: str = ""
    principios: list = field(default_factory=list)
    ciclo_activo: bool = True
    reputacion: int = 0


class ConsensusPoA:
    """Gestiona la seleccion y reputacion de validadores simbolicos."""

    def __init__(self):
        self.validadores = self._cargar_validadores()

    def _cargar_validadores(self):
        if VALIDADORES_PATH.exists():
            with open(VALIDADORES_PATH, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                return [ValidadorSimbolico(**v) for v in data]
        return []

    def _guardar_validadores(self):
        data = [v.__dict__ for v in self.validadores]
        with open(VALIDADORES_PATH, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)

    def registrar_validador(self, validador: ValidadorSimbolico):
        self.validadores.append(validador)
        self._guardar_validadores()

    def seleccionar_validador(self, ciclo: int) -> ValidadorSimbolico | None:
        activos = [v for v in self.validadores if v.ciclo_activo]
        if not activos:
            return None
        indice = ciclo % len(activos)
        return activos[indice]

    def validar_bloque(self, bloque: dict, validador: ValidadorSimbolico) -> bool:
        if not validador.ciclo_activo:
            return False
        if bloque.get("principio") not in validador.principios:
            return False
        if bloque.get("tipo") != validador.arquetipo:
            return False

        contenido = json.dumps(bloque, sort_keys=True).encode()
        bloque_hash = hashlib.sha256(contenido).hexdigest()
        self._log_validacion(validador.node_id, bloque_hash, True)
        return True

    def actualizar_reputacion(self, validador: ValidadorSimbolico, resultado: bool):
        if resultado:
            validador.reputacion += 1
        else:
            validador.reputacion = max(validador.reputacion - 1, 0)
        self._guardar_validadores()
        self._log_reputacion(validador)

    def registrar_evento_simbólico(self, bloque: dict, tipo: str, principio: str) -> dict:
        evento = {
            "timestamp": datetime.utcnow().isoformat(),
            "tipo": tipo,
            "principio": principio,
            "bloque": hashlib.sha256(json.dumps(bloque).encode()).hexdigest(),
        }
        return evento

    # Logging utilities
    def _log_validacion(self, validador_id: str, bloque_hash: str, resultado: bool):
        path = LOG_DIR / "validaciones.json"
        log = []
        if path.exists():
            with open(path, "r", encoding="utf-8") as fh:
                log = json.load(fh)
        log.append({
            "validador": validador_id,
            "bloque": bloque_hash,
            "resultado": resultado,
            "timestamp": datetime.utcnow().isoformat(),
        })
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(log, fh, indent=2)

    def _log_reputacion(self, validador: ValidadorSimbolico):
        path = LOG_DIR / "reputacion.json"
        log = []
        if path.exists():
            with open(path, "r", encoding="utf-8") as fh:
                log = json.load(fh)
        log.append({
            "validador": validador.node_id,
            "reputacion": validador.reputacion,
            "timestamp": datetime.utcnow().isoformat(),
        })
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(log, fh, indent=2)

