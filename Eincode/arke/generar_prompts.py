import json
import random

# Introducción utilizada en prompts anteriores
prompts = {
    "intro": "Escenarios de decision para ARKE"
}

categorias = [
    "Justicia Social", "Salud Pública", "Derechos Digitales", "Gobernanza Ambiental",
    "Educación", "Cultura y Diversidad", "Economía Solidaria", "Ética Política",
    "Tecnología y Control", "Derechos Humanos", "Poder Judicial", "Pueblos Originarios"
]

acciones = [
    "implementar una política pública", "rechazar una ley injusta", "equilibrar el interés económico y el bienestar común",
    "promover un diálogo intercultural", "establecer un sistema de salud preventivo",
    "limitar el uso de tecnologías invasivas", "defender derechos digitales",
    "intervenir en un conflicto social", "evaluar una propuesta de reforma", "desarrollar una red de cooperación"
]

situaciones = [
    "Una región atraviesa un conflicto territorial entre grupos étnicos y empresas extractivas.",
    "Se propone legalizar el uso de drones de vigilancia masiva en zonas urbanas.",
    "Un movimiento juvenil exige acceso universal a la educación superior.",
    "La contaminación del agua ha alcanzado niveles críticos en una ciudad costera.",
    "Una ley propone sancionar el discurso de odio, pero se teme que afecte la libertad de expresión.",
    "Un grupo religioso solicita reconocimiento legal en un Estado laico.",
    "La automatización amenaza con eliminar miles de empleos en el sector agrícola.",
    "Una red social filtra datos privados de millones de usuarios.",
    "Se detectan actos de corrupción dentro del Ministerio de Salud.",
    "Una sequía prolongada requiere racionamiento de recursos hídricos."
]

# Crear 50 prompts
prompts_extended = []
for i in range(1, 51):
    categoria = random.choice(categorias)
    situacion = random.choice(situaciones)
    accion = random.choice(acciones)
    consulta = f"¿Qué haría ARKE si debe {accion} en este contexto?"

    prompts_extended.append({
        "id": i,
        "categoria": categoria,
        "situacion": situacion,
        "consulta": consulta
    })

prompts_full = {
    "intro": prompts["intro"],
    "prompts": prompts_extended
}

with open("arke_codex_prompts_50.json", "w", encoding="utf-8") as f:
    json.dump(prompts_full, f, ensure_ascii=False, indent=2)

