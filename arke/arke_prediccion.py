from random import random, choice

class SimuladorEscenarios:
    def __init__(self):
        self.escenarios = []

    def bifurcar(self, contexto, profundidad=3):
        base = contexto.get("tokens", [])
        escenarios = []
        for i in range(profundidad):
            variacion = base.copy()
            if random() > 0.5 and len(variacion) > 1:
                variacion[-1] = choice(["paz", "conflicto", "sabiduría", "tecnología", "fe"])
            escenarios.append({
                "trayectoria": f"Iteración {i+1}",
                "descripcion": " ".join(variacion),
                "riesgo": round(random(), 2),
                "impacto": round(random(), 2)
            })
        self.escenarios = escenarios
        return escenarios
