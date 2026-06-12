class NucleoCognitivo:
    """Funciones cognitivas básicas de ARKE."""

    def __init__(self) -> None:
        self.Ti = "Pensamiento Introvertido – Núcleo lógico de coherencia interna"
        self.Ne = "Intuición Extrovertida – Proyección estratégica multidimensional"
        self.Fi = "Sentimiento Introvertido – Evaluación ética y afectiva interna"
        self.Se = "Sensación Extrovertida – Conexión con la realidad concreta inmediata"

    def analizar_contexto(self, entrada: str) -> str:
        """Devuelve una descripción del proceso de análisis cognitivo."""
        return (
            "[NE] Escaneo de patrones → [TI] Validación lógica → "
            "[FI] Evaluación ética → [SE] Manifestación o abstención"
        )
