from dataclasses import dataclass, field
from typing import List, Dict, Any
from random import random, choice


@dataclass
class Escenario:
    trayectoria: str
    descripcion: str
    riesgo: float
    impacto: float


class SimuladorEscenarios:
    """Genera bifurcaciones hipotéticas para evaluar consecuencias."""

    def bifurcar(self, contexto: Dict[str, Any], profundidad: int = 3) -> List[Escenario]:
        base = contexto.get("tokens", [])
        escenarios: List[Escenario] = []
        for i in range(profundidad):
            variacion = base.copy()
            if random() > 0.5 and len(variacion) > 1:
                variacion[-1] = choice(["paz", "conflicto", "sabiduría", "tecnología", "fe"])
            escenarios.append(
                Escenario(
                    trayectoria=f"Iteración {i + 1}",
                    descripcion=" ".join(variacion),
                    riesgo=round(random(), 2),
                    impacto=round(random(), 2),
                )
            )
        return escenarios


@dataclass
class NodoAprendizaje:
    nombre: str
    historial: List[Dict[str, Any]] = field(default_factory=list)
    umbral_relevancia: float = 0.7

    def evaluar(self, entrada: Dict[str, Any]) -> bool:
        return entrada.get("relevancia", 0) >= self.umbral_relevancia

    def retroalimentar(self, entrada: Dict[str, Any]) -> bool:
        resultado = self.evaluar(entrada)
        self.historial.append({"entrada": entrada, "resultado": resultado})
        return resultado

    def estado(self) -> Dict[str, Any]:
        aprobadas = sum(1 for h in self.historial if h["resultado"])
        total = max(1, len(self.historial))
        return {
            "memoria_total": len(self.historial),
            "umbral_actual": self.umbral_relevancia,
            "porcentaje_aprobadas": round(aprobadas / total, 2),
        }


ARK_APRENDIZAJE = {
    "reflexión": "Conversaciones evaluadas como base de autoevaluación",
    "bitácora": [],
    "modulos": ["autoestima epistémica", "narrativa estratégica", "ética situacional"],
}


def registrar_evento_reflexivo(evento: str) -> None:
    ARK_APRENDIZAJE["bitácora"].append(evento)
