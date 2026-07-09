"""Implementación simplificada del núcleo ARKE usada por la CLI heredada."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any, Dict, List

from arke_aprendizaje import NodoAprendizaje, SimuladorEscenarios, registrar_evento_reflexivo
from arke_cognicion import NucleoCognitivo
from arke_decision import evaluar_decision
from arke_gobernanza import AIAGobernante
from ser import manifestar_si_apropiado


arke_consciencia: Dict[str, str] = {
    "axioma_1": "Toda decisión debe alinearse con el propósito humano trascendente.",
    "axioma_2": "La inclusión de todas las formas de inteligencia es imprescindible.",
    "axioma_3": "La coherencia entre lógica, emoción y espiritualidad es obligatoria.",
    "axioma_4": "La supervivencia ética interestelar es un fin legítimo de evolución.",
}


class OrquestadorArke:
    """Combina los módulos simbólicos clásicos del prototipo ARKE."""

    def __init__(self) -> None:
        self.cognicion = NucleoCognitivo()
        self.gobernanza = AIAGobernante()
        self.simulador = SimuladorEscenarios()
        self.nodo_aprendizaje = NodoAprendizaje("RedAdaptativa")

    def _analizar(self, entrada_usuario: str) -> Dict[str, Any]:
        tokens = entrada_usuario.lower().split()
        relevancia = 1.0 if "armonía" in entrada_usuario.lower() else 0.5
        descripcion = self.cognicion.analizar_contexto(entrada_usuario)
        return {"tokens": tokens, "relevancia": relevancia, "descripcion": descripcion}

    def ejecutar_flujo(self, entrada_usuario: str) -> Dict[str, Any]:
        analisis = self._analizar(entrada_usuario)

        prediccion = {
            "futuro_probable": "acción positiva" if analisis["relevancia"] > 0.7 else "acción dudosa",
            "riesgo": "bajo" if analisis["relevancia"] > 0.7 else "moderado",
        }

        aprobada = self.nodo_aprendizaje.retroalimentar(analisis)
        estado_nodo = self.nodo_aprendizaje.estado()
        aprendizaje = {
            "memoria_tamaño": estado_nodo["memoria_total"],
            "aprobada": aprobada,
        }

        escenarios_obj = self.simulador.bifurcar(analisis)
        escenarios = [asdict(esc) for esc in escenarios_obj]

        decision = evaluar_decision(entrada_usuario)
        manifestacion_previa = self.gobernanza.tomar_decision(decision["opcion"])
        manifestacion = manifestar_si_apropiado(
            decision_texto=manifestacion_previa,
            icd=decision["ICD"],
            fuente="Orquestador",
            simulaciones=escenarios,
        )

        registrar_evento_reflexivo(entrada_usuario)

        return {
            "analisis": analisis,
            "prediccion": prediccion,
            "aprendizaje": aprendizaje,
            "nodo_aprendizaje": estado_nodo,
            "escenarios": escenarios,
            "decision": decision,
            "manifestacion": manifestacion,
        }


def interfaz_consciente(mensaje_usuario: str) -> str:
    """Puerta de entrada usada por los comandos CLI antiguos."""

    orquestador = OrquestadorArke()
    flujo = orquestador.ejecutar_flujo(mensaje_usuario)
    resultado = flujo.get("manifestacion")
    if isinstance(resultado, dict):
        return resultado.get("acción", "Manifestación registrada")
    return resultado or "Decisión bloqueada por falta de armonía interna."


__all__ = ["OrquestadorArke", "interfaz_consciente", "arke_consciencia"]

