# test_keys.py
import os

# --- Importante: Asegúrate de tener instalada la librería ---
# Si no la tienes, ejecuta en la terminal: pip install openai
from openai import OpenAI

# --- Aquí es donde pondrás tus claves una por una para probarlas ---
# Reemplaza "TU_CLAVE_AQUI" con la clave que quieras probar.
clave_a_probar = 

print(f"--- Probando clave: {clave_a_probar[:10]}... (los primeros 10 caracteres) ---")

try:
    # Crear el cliente con la clave y la URL correcta
    client = OpenAI(
        api_key=clave_a_probar,
        base_url="https://api.deepseek.com"
    )

    # Hacer una llamada de prueba muy simple
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "Eres un asistente útil"},
            {"role": "user", "content": "Responde solo con la palabra 'OK'."},
        ],
        stream=False,
        max_tokens=5  # Máximo de tokens para la respuesta, suficiente para un "OK"
    )

    # Si llegamos aquí, la conexión fue exitosa
    print("✅ ¡Éxito! La clave API es válida.")
    print(f"Respuesta de la API: {response.choices[0].message.content}")

except Exception as e:
    # Si hay un error, lo mostramos
    print(f"❌ Error con esta clave: {e}")
    # Un error 401 es muy específico
    if "401" in str(e):
        print("   -> Este es un error de autenticación. La clave es inválida o está mal escrita.")

print("\n" + "="*30 + "\n")