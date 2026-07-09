from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List


@dataclass
class Escenario:
    nombre: str
    probabilidad: float
    descripcion: str


class SimuladorEscenarios:
    """Genera escenarios simples para los flujos simbolicos heredados."""

    def bifurcar(self, analisis: Dict[str, Any]) -> List[Escenario]:
        relevancia = float(analisis.get("relevancia", 0.5))
        positiva = max(0.0, min(1.0, relevancia))
        negativa = round(1.0 - positiva, 3)
        return [
            Escenario(
                nombre="trayectoria_armonica",
                probabilidad=round(positiva, 3),
                descripcion="Continuidad etica del sistema.",
            ),
            Escenario(
                nombre="trayectoria_tension",
                probabilidad=negativa,
                descripcion="Requiere ajustes de gobernanza.",
            ),
        ]


class NodoAprendizaje:
    """Memoria minima para registrar contexto y aprobaciones."""

    def __init__(self, nombre: str) -> None:
        self.nombre = nombre
        self._memoria: List[Dict[str, Any]] = []

    def retroalimentar(self, analisis: Dict[str, Any]) -> bool:
        self._memoria.append(analisis)
        return float(analisis.get("relevancia", 0.0)) >= 0.5

    def estado(self) -> Dict[str, Any]:
        return {"nombre": self.nombre, "memoria_total": len(self._memoria)}


def registrar_evento_reflexivo(evento: str, destino: str = "star_ledger.json") -> None:
    linea = f"{datetime.utcnow().isoformat()}|{evento}\n"
    with Path(destino).open("a", encoding="utf-8") as fh:
        fh.write(linea)
