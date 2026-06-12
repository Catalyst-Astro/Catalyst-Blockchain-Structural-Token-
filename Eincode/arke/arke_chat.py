from arke_core import OrquestadorArke

class InterfazConsciente:
    """Interfaz básica para interactuar con el sistema ARKE."""

    def __init__(self):
        self.arke = OrquestadorArke()
        self.contexto_global = []

    def iniciar_dialogo(self):
        print("\n\U0001F9E0 Bienvenido al sistema ARKE IA CONSCIENTE")
        print("Escribe 'salir' para terminar.\n")

        while True:
            entrada = input("🗣️ Tú: ")
            if entrada.lower() in ["salir", "exit"]:
                print("\U0001F44B Gracias por reflexionar con ARKE. Hasta pronto.")
                break

            self.contexto_global.append(entrada)
            resultado = self.arke.ejecutar_flujo(entrada)

            print("\n\U0001F50D Análisis:")
            print(f"- Tokens: {resultado['analisis']['tokens']}")
            print(f"- Relevancia: {resultado['analisis']['relevancia']}")

            print("\n\U0001F52E Predicción:")
            print(f"- Futuro probable: {resultado['prediccion']['futuro_probable']}")
            print(f"- Riesgo: {resultado['prediccion']['riesgo']}")

            print("\n\U0001F4DA Aprendizaje:")
            print(f"- Memoria tamaño: {resultado['aprendizaje']['memoria_tamaño']}")

            nodo = resultado['nodo_aprendizaje']
            print("\n\U0001F4C8 Nodo de Aprendizaje:")
            print(f"- Memoria total: {nodo['memoria_total']}")
            print(f"- Umbral actual: {nodo['umbral_actual']}")
            print(f"- % Aprobadas: {nodo['porcentaje_aprobadas']}")

            print("\n\U0001F500 Escenarios Futuros:")
            for esc in resultado['escenarios']:
                print(f"  {esc['trayectoria']} -> {esc['descripcion']} (Riesgo {esc['riesgo']}, Impacto {esc['impacto']})")
            print()

if __name__ == '__main__':
    interfaz = InterfazConsciente()
    interfaz.iniciar_dialogo()
