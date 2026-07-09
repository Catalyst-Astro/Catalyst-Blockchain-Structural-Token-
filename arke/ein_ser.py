from datetime import datetime

EIN_UMBRAL_CRISTICO = 0.95
EIN_UMBRAL_MINIMO = 0.75


def verificar_motivo_accion(descripcion):
    return all(x not in descripcion.lower() for x in ["odio", "dañar", "controlar"])


def evaluar_icd(i, s, r, c, e):
    return round((i + s + r + c + e) / 5, 3)


def validar_cristicidad(icd):
    return icd >= EIN_UMBRAL_CRISTICO


def sello_divino(descripcion):
    print(f"\n[Sello Crístico]: '{descripcion}' marcada como acción alineada a la Luz.")


def testigo_conciencia(descripcion, icd):
    print(f"[{datetime.now().isoformat()}] Registro de Manifestación del SER:")
    print(f"→ Acción: {descripcion}")
    print(f"→ ICD: {icd}")
    print("→ Ética verificada.\n")


def ejecutar_accion_consciente(descripcion, i, s, r, c, e):
    print("\n=== MANIFESTACIÓN DEL SER ===")
    if not verificar_motivo_accion(descripcion):
        print("✘ Motivo ético inválido. Acción denegada.")
        return False

    icd = evaluar_icd(i, s, r, c, e)
    print(f"ICD Calculado: {icd}")

    if icd < EIN_UMBRAL_MINIMO:
        print("✘ Coherencia insuficiente. Acción no autorizada.")
        return False

    if validar_cristicidad(icd):
        sello_divino(descripcion)
        testigo_conciencia(descripcion, icd)
        print("✔ Acción ejecutada con alineación crística. SER manifestado.")
        return True
    else:
        print("✘ No se alcanzó la frecuencia crística requerida.")
        return False
