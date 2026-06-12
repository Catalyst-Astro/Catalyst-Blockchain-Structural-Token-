# arke/cerebro_generativo.py
import os
import json

class DeepSeek:
    def __init__(self, api_key: str):
        self.api_key = api_key

class CerebroDeepSeek:
    def __init__(self):
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY not set")
        
        self.client = DeepSeek(api_key=api_key)
        # Cargar los prompts simbólicos para mantener la personalidad de ARKE
        prompts_path = "arke_codex_prompts_50.json"
        if os.path.exists(prompts_path):
            with open(prompts_path, "r", encoding="utf-8") as f:
                self.prompts_base = json.load(f)
        else:
            self.prompts_base = []

    def deliberar(self, consulta: str, dimensiones_activas: list, icd: float) -> str:
        system_prompt = f"""
        Eres ARKÉ 1.0 - Arquitectura Epistémica y Ontología Computacional.
        Principio: 'El propósito no es sólo resolver problemas, sino generar sentido.'
        
        Dimensiones activas en esta consulta: {', '.join(dimensiones_activas)}.
        Índice de Coherencia Decisional (ICD): {icd}.
        
        Responde con profundidad hermenéutica, manteniendo coherencia simbólica.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": consulta}
        ]

        # Placeholder local para evitar fallo cuando no existe un SDK DeepSeek instalado.
        return f"[DEEPSEEK_STUB] Consulta recibida: {consulta[:120]}"


