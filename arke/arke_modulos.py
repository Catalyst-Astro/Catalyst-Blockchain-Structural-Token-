class ModuloBase:
    def __init__(self, nombre):
        self.nombre = nombre

    def ejecutar(self, *args, **kwargs):
        raise NotImplementedError("Método 'ejecutar' no implementado.")

# --- Módulo de Análisis ---
class ModuloAnalisis(ModuloBase):
    def ejecutar(self, entrada_textual):
        simbolico = entrada_textual.lower().split()
        return {
            "tokens": simbolico,
            "longitud": len(simbolico),
            "relevancia": 1.0 if "armonía" in simbolico else 0.5
        }

# --- Módulo de Predicción ---
class ModuloPrediccion(ModuloBase):
    def ejecutar(self, contexto):
        if contexto["relevancia"] > 0.7:
            return {"futuro_probable": "acción positiva", "riesgo": "bajo"}
        else:
            return {"futuro_probable": "acción dudosa", "riesgo": "moderado"}

# --- Módulo de Aprendizaje (dummy) ---
class ModuloAprendizaje(ModuloBase):
    def __init__(self, nombre):
        super().__init__(nombre)
        self.memoria = []

    def ejecutar(self, resultado):
        self.memoria.append(resultado)
        return {"memoria_tamaño": len(self.memoria), "última_adición": resultado}

