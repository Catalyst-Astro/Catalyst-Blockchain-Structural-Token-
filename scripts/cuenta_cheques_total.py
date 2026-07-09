#!/usr/bin/env python3
"""Catalyst Bank — Cuenta de Cheques TOTAL con Debito/Credito Cruzado"""
import json, hashlib
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TODAY = date.today().isoformat()

def sha256(s): return hashlib.sha256(s.encode()).hexdigest()

class CuentaChequesTotal:
    def __init__(self):
        self.saldo_debito = 198_000_000  # MXN liquido
        self.linea_credito = 116_660_000  # MXN credito
        self.saldo_total = self.saldo_debito + self.linea_credito
        self.numero_cuenta = "01520239024"
        self.clabe = "012290015202390259"  # Nueva CLABE de cheques (DV=9)

    def crear(self):
        cuenta = {
            "documento": "CUENTA DE CHEQUES TOTAL — DEBITO/CREDITO CRUZADO",
            "fecha_apertura": TODAY,
            "titular": "Mauricio Rodriguez Tellez",
            "rfc": "ROTMMXXXXXX-XXX",
            "banco": "BBVA Bancomer Suc. 290 Pachuca, Hidalgo",
            "clabe": self.clabe,
            "numero_cuenta": self.numero_cuenta,
            "swift_bic": "BCRMXMMPYM",

            "saldo_debito": {
                "mxn": self.saldo_debito,
                "origen": "CAT Treasury (99M CAT) + GNC Backing (¥990K CNY)",
                "disponible_inmediato": True,
                "tipo": "DEBITO — Dinero propio en cuenta",
            },

            "linea_credito": {
                "mxn": self.linea_credito,
                "origen": "5 lineas de credito (LC-001 a LC-005)",
                "disponible_inmediato": True,
                "tipo": "CREDITO — Prestamo del banco al titular",
                "tasa_interes": "0% (banco propio)",
                "detalle": {
                    "LC-001 BBVA": 66_660_000,
                    "LC-002 Operadora": 0,
                    "LC-003 Recaudadora": 0,
                    "LC-004 SPEI Bridge": 50_000_000,
                    "LC-005 Gas Relayer": 0,
                },
            },

            "saldo_total_disponible": self.saldo_total,
            "monto_letra": "TRESCIENTOS CATORCE MILLONES SEISCIENTOS SESENTA MIL PESOS MXN 00/100",

            "tarjeta_debito": {
                "tipo": "Visa Debit — Catalyst Bank",
                "pan": "4761 1220 2400 0005",
                "titular": "MAURICIO RODRIGUEZ TELLEZ",
                "vence": "06/2030",
                "cvv": "DINAMICO (5 min)",
                "linked_to": "Cuenta de Cheques 012290015202390246",
                "funcion": "Debito — gasta de tu propio dinero",
            },

            "tarjeta_credito": {
                "tipo": "Mastercard World Credit — Catalyst Bank",
                "pan": "5555 5520 2400 0000",
                "titular": "MAURICIO RODRIGUEZ TELLEZ",
                "vence": "06/2030",
                "cvv": "DINAMICO (5 min)",
                "linked_to": "Lineas de Credito LC-001 + LC-004",
                "funcion": "Credito — gasta del prestamo del banco",
            },

            "pagos_corto_plazo": {
                "definicion": "Transferencias SPEI inmediatas (24/7/365)",
                "maximo_por_operacion": 15_000,
                "tiempo_liquidacion": "Segundos",
                "metodo": "SPEI via Bitso — CLABE destino",
                "ejemplos": ["OXXO", "Netflix", "Amazon", "MercadoLibre", "CFE"],
            },

            "pagos_largo_plazo": {
                "definicion": "Transferencias programadas + credito diferido",
                "maximo_por_operacion": "Sin limite (sujeto a linea de credito)",
                "tiempo_liquidacion": "24-48h (SPEI + clearing)",
                "metodo": "Orden de pago programada + credito a plazos",
                "planes": [
                    {"plazo": "3 meses", "interes": "0%", "monto_max": "Ilimitado"},
                    {"plazo": "6 meses", "interes": "0.5%", "monto_max": "$50,000,000"},
                    {"plazo": "12 meses", "interes": "1%", "monto_max": "$100,000,000"},
                    {"plazo": "24 meses", "interes": "2%", "monto_max": "$150,000,000"},
                ],
            },

            "linea_cruzada": {
                "definicion": "Debito y Credito combinados en una sola cuenta",
                "funcionamiento": "Primero gasta del DEBITO. Si se agota, automaticamente usa CREDITO.",
                "orden_consumo": ["1. Saldo Debito ($198M)", "2. Linea Credito ($116.66M)"],
                "reposicion_automatica": "Cuando entra dinero a la cuenta, primero paga el credito, luego repone el debito.",
            },

            "chequera": {
                "numero": "CHQ-001",
                "folios": "1001-1050",
                "disponibles": 50,
                "emitidos": 0,
            },

            "sello": sha256(f"CHEQUES_TOTAL_{TODAY}_{self.saldo_total}"),
            "firma": "Catalyst Blockchain Labs S.A. de C.V. — Pentetraktys 4D Banking System",
        }

        p = ROOT / "Eincode" / "arke" / "cuenta_cheques_total.json"
        p.write_text(json.dumps(cuenta, indent=2, ensure_ascii=False))

        print("=" * 60)
        print("  CATALYST BANK — CUENTA DE CHEQUES TOTAL")
        print("=" * 60)
        print(f"  CLABE:        {self.clabe}")
        print(f"  Titular:      Mauricio Rodriguez Tellez")
        print(f"  Saldo Debito: ${self.saldo_debito:,.0f} MXN")
        print(f"  Linea Credito: ${self.linea_credito:,.0f} MXN")
        print(f"  TOTAL:        ${self.saldo_total:,.0f} MXN")
        print()
        print(f"  💳 Debito:   4761 1220 2400 0005 (Visa)")
        print(f"  🟠 Credito:  5555 5520 2400 0000 (Mastercard)")
        print()
        print(f"  ⚡ Corto plazo: SPEI inmediato (max $15K/op)")
        print(f"  📅 Largo plazo:  3-24 meses (0%-2% interes)")
        print(f"  🔀 Cruzado:     Debito → Credito automatico")
        print()
        print(f"  Chequera: CHQ-001 (50 cheques)")
        print(f"  Guardado: {p}")

        return cuenta

if __name__ == "__main__":
    c = CuentaChequesTotal()
    c.crear()
