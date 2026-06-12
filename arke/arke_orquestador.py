from __future__ import annotations

from typing import Any, Dict

try:
    # Modo paquete: importado como `arke.arke_orquestador`
    from .arke_cognicion import NucleoCognitivo
    from .arke_decision import evaluar_decision
    from .arke_gobernanza import AIAGobernante
    from .boo_scanner import BooModule, BooScanner
except ImportError:
    # Modo script legado: importado con `sys.path` apuntando a `arke/`
    from arke_cognicion import NucleoCognitivo
    from arke_decision import evaluar_decision
    from arke_gobernanza import AIAGobernante
    from boo_scanner import BooModule, BooScanner

from arke_aprendizaje import NodoAprendizaje, SimuladorEscenarios, registrar_evento_reflexivo


class OrquestadorArke:
    """Orquesta EINCODE con atencion selectiva (Boo Scanner)."""

    def __init__(self) -> None:
        self.cognicion = NucleoCognitivo()
        self.gobernanza = AIAGobernante()
        self.simulador = SimuladorEscenarios()
        self.nodo_aprendizaje = NodoAprendizaje("RedAdaptativa")
        self.boo = BooScanner(
            modules=[
                BooModule("cognicion", ("analisis", "logica", "pregunta", "datos"), 0.7, self._run_cognicion),
                BooModule("simulador", ("escenario", "futuro", "riesgo", "crisis"), 0.9, self._run_simulador),
                BooModule("decision", ("decision", "estrategia", "tactica", "opcion"), 0.9, self._run_decision),
                BooModule("gobernanza", ("gobernanza", "accion", "ejecucion", "mando"), 0.85, self._run_gobernanza),
                BooModule("aprendizaje", ("historial", "memoria", "aprendizaje", "patron"), 0.6, self._run_aprendizaje),
            ],
            threshold=0.5,
            top_k=4,
        )

    def _analizar(self, entrada_usuario: str) -> Dict[str, Any]:
        tokens = entrada_usuario.lower().split()
        relevancia = 1.0 if "armonía" in entrada_usuario.lower() or "armonia" in entrada_usuario.lower() else 0.5
        return {"tokens": tokens, "relevancia": relevancia}

    def _run_cognicion(self, analisis: dict[str, Any], entrada: str) -> dict[str, Any]:
        descripcion = self.cognicion.analizar_contexto(entrada)
        return {"descripcion": descripcion, "tokens": analisis.get("tokens", [])}

    def _run_simulador(self, analisis: dict[str, Any], _entrada: str) -> dict[str, Any]:
        escenarios = [e.__dict__ for e in self.simulador.bifurcar(analisis)]
        riesgo = "bajo" if analisis.get("relevancia", 0) > 0.7 else "moderado"
        return {
            "escenarios": escenarios,
            "prediccion": {
                "futuro_probable": "acción positiva" if analisis.get("relevancia", 0) > 0.7 else "acción dudosa",
                "riesgo": riesgo,
            },
        }

    def _run_decision(self, _analisis: dict[str, Any], entrada: str) -> dict[str, Any]:
        return {"decision": evaluar_decision(entrada)}

    def _run_gobernanza(self, _analisis: dict[str, Any], entrada: str) -> dict[str, Any]:
        return {"manifestacion": self.gobernanza.tomar_decision(entrada)}

    def _run_aprendizaje(self, analisis: dict[str, Any], _entrada: str) -> dict[str, Any]:
        aprobada = self.nodo_aprendizaje.retroalimentar(analisis)
        return {"aprendizaje": {"aprobada": aprobada}, "nodo_aprendizaje": self.nodo_aprendizaje.estado()}

    def ejecutar_flujo(self, entrada_usuario: str) -> Dict[str, Any]:
        analisis = self._analizar(entrada_usuario)
        seleccionados = self.boo.select_modules(entrada_usuario)
        relevancias = [self.boo._score(entrada_usuario, mod) for mod in seleccionados]
        entropia_interna = self.boo.estimate_internal_entropy(relevancias)

        data: dict[str, Any] = {
            "analisis": analisis,
            "prediccion": {},
            "aprendizaje": {},
            "nodo_aprendizaje": self.nodo_aprendizaje.estado(),
            "escenarios": [],
            "decision": {"opcion": None, "ICD": 0.0},
            "manifestacion": None,
        }

        for modulo in seleccionados:
            data.update(modulo.handler(analisis, entrada_usuario))

        decision = data.get("decision", {"opcion": None, "ICD": 0.0})
        icd = float(decision.get("ICD", 0.0))
        collapse = self.boo.collapse(data.get("escenarios", []), icd)
        idt = collapse["idt"]
        vt = collapse["vt"]
        if not data.get("manifestacion"):
            data["manifestacion"] = self.gobernanza.tomar_decision(decision.get("opcion"))

        accion = {
            "recomendada": data["manifestacion"],
            "escenario_ganador": collapse["escenario"],
            "justificacion": f"Seleccion por IDT={idt} (ICD={icd}, VT={vt})",
        }

        registrar_evento_reflexivo(entrada_usuario)
        return {
            **data,
            "modulos_activados": [m.name for m in seleccionados],
            "entropia_interna": entropia_interna,
            "icd": round(icd, 3),
            "vt": vt,
            "idt": idt,
            "accion": accion,
        }


def interfaz_consciente(mensaje_usuario: str) -> str:
    orquestador = OrquestadorArke()
    resultado = orquestador.ejecutar_flujo(mensaje_usuario)
    return resultado["manifestacion"] or "Decisión bloqueada por falta de armonía interna."


if __name__ == "__main__":
    mensaje = input("Mensaje para ARKE: ")
    print(interfaz_consciente(mensaje))
