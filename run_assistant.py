#!/usr/bin/env python3
import os
import argparse
import yaml
from openai import OpenAI

def cargar_config(ruta: str) -> dict:
    with open(ruta, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)
    
    api_key = config['deepseek']['api_key']
    # Resolver variable de entorno si está en formato ${VAR}
    if isinstance(api_key, str) and api_key.startswith('${') and api_key.endswith('}'):
        env_var = api_key[2:-1]
        api_key = os.environ.get(env_var)
        if not api_key:
            raise ValueError(f"Variable de entorno {env_var} no definida")
    config['deepseek']['api_key'] = api_key
    return config

def consultar_deepseek(config: dict, prompt: str) -> str:
    client = OpenAI(
        api_key=config['deepseek']['api_key'],
        base_url=config['deepseek']['base_url']
    )
    params = {
        "model": config['deepseek']['model'],
        "messages": [
            {"role": "system", "content": "Eres un asistente útil y reflexivo de ARKE."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": config['deepseek']['max_tokens'],
        "stream": False
    }
    # Agregar reasoning_effort solo si el modelo lo soporta (deepseek-reasoner)
    if config['deepseek'].get('reasoning_effort'):
        params["reasoning_effort"] = config['deepseek']['reasoning_effort']
    # thinking solo para deepseek-v3, no para deepseek-chat
    # if config['deepseek'].get('thinking_enabled'):
    #     params["extra_body"] = {"thinking": {"type": "enabled"}}
    
    response = client.chat.completions.create(**params)
    return response.choices[0].message.content

def test_deepseek_api(api_key: str, base_url: str, model: str) -> bool:
    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Responde solo 'OK'"}],
            max_tokens=5
        )
        return resp.choices[0].message.content.strip() == "OK"
    except Exception as e:
        print(f"❌ Error probando API key: {e}")
        return False

def modo_prompt(config: dict, pregunta: str):
    if not test_deepseek_api(config['deepseek']['api_key'],
                             config['deepseek']['base_url'],
                             config['deepseek']['model']):
        print("❌ Clave API inválida. Revisa assistant_config.yaml o tu variable de entorno.")
        return
    respuesta = consultar_deepseek(config, pregunta)
    print(f"\n🤖 Asistente: {respuesta}\n")

def modo_chat(config: dict):
    if not test_deepseek_api(config['deepseek']['api_key'],
                             config['deepseek']['base_url'],
                             config['deepseek']['model']):
        print("❌ Clave API inválida. No se puede iniciar el chat.")
        return
    print("🧠 Iniciando asistente ARKE+DeepSeek (modo chat). Escribe 'salir' para terminar.\n")
    while True:
        user_input = input("🗣️ Tú: ")
        if user_input.lower() in config['asistente']['comando_salida']:
            break
        respuesta = consultar_deepseek(config, user_input)
        print(f"🤖 Asistente: {respuesta}\n")

def main():
    parser = argparse.ArgumentParser(description="Asistente ARKE CLI")
    parser.add_argument("--config", default="assistant_config.yaml", help="Ruta al archivo YAML")
    parser.add_argument("--prompt", help="Enviar una sola pregunta y salir")
    parser.add_argument("--chat", action="store_true", help="Iniciar chat interactivo")
    args = parser.parse_args()

    try:
        config = cargar_config(args.config)
    except Exception as e:
        print(f"Error cargando configuración: {e}")
        return

    if args.prompt:
        modo_prompt(config, args.prompt)
    elif args.chat:
        modo_chat(config)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()