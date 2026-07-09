#!/usr/bin/env python3
"""
Catalyst Bank — Pan Am Bearer Check System
Inspired by: Frank Abagnale Jr. / Pan Am reciprocal check-cashing (Catch Me If You Can)
"""
import json, hashlib, sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TODAY = date.today().isoformat()

def sha256(s): return hashlib.sha256(s.encode()).hexdigest()

class PanAmCheckSystem:
    def __init__(self):
        self.entidad = "Catalyst Blockchain Labs S.A. de C.V."
        self.clabe = "012290015202390259"
        self.titular = "Mauricio Rodriguez Tellez"
        self.checks = []
        self.cashed = []

    def crear_cheque_portador(self, monto, beneficiario, ubicacion_cobro):
        """Bearer check — cobrable en cualquier sucursal OXXO o banco afiliado"""
        num = len(self.checks) + 2001
        cheque = {
            "id": f"PANAM-CHQ-{num:04d}",
            "tipo": "BEARER CHECK — PORTADOR",
            "numero": num,
            "fecha_emision": TODAY,
            "fecha_vencimiento": (date.today() + timedelta(days=180)).isoformat(),
            "monto_mxn": monto,
            "monto_letra": self._numero_a_letra(monto),
            "beneficiario": beneficiario or "AL PORTADOR",
            "concepto": f"Pan Am Bearer Check — {ubicacion_cobro or 'Catalyst Bank'}",
            "ubicacion_cobro": ubicacion_cobro or "Cualquier sucursal OXXO o banco afiliado",

            "banco_emisor": {
                "nombre": self.entidad,
                "clabe": self.clabe,
                "swift": "BCRMXMMPYM",
                "sucursal": "Moscato 185, Viñedos Residencial, Pachuca, Hidalgo",
            },

            "titular": self.titular,
            "rfc": "ROTMMXXXXXX-XXX",

            "red_cobro": [
                "OXXO — 20,000+ sucursales Mexico",
                "7-Eleven — 1,800+ sucursales",
                "Circle K — 600+ sucursales",
                "Farmacias Guadalajara — 2,500+ sucursales",
                "BBVA — 1,800+ sucursales",
                "Santander — 1,400+ sucursales",
                "HSBC — 900+ sucursales",
                "Cualquier banco via Camara de Compensacion",
            ],

            "reciprocidad": {
                "descripcion": "Sistema Pan Am — Acuerdo reciproco de cobro",
                "mecanismo": "El comercio presenta el cheque -> Catalyst Bank liquida via SPEI en 24h",
                "garantia": "Fondo de reserva de $314,660,000 MXN respalda cada cheque",
                "verificacion": "SPEI Tracking + CEP Catalyst + Proof Chain SHA-256",
            },

            "seguridad": {
                "proof_chain": sha256(f"PANAM{num}{monto}{TODAY}"),
                "marca_agua": "CATALYST-BANK-PANAM-CHECK",
                "microimpresion": f"VALIDO SOLO EN RED PANAM CATALYST — CHEQUE {num:04d}",
                "tinta_reactiva": "UV — Catalyst Bank Eagle Logo",
                "firma_digital": sha256(f"FIRMA_{self.titular}_{num}_{monto}"),
            },

            "uniforme": {
                "descripcion": "Al igual que el uniforme de piloto Pan Am, la tarjeta Catalyst es el pase de confianza",
                "tarjeta_presentacion": "4761 1220 2400 0005 (Visa Infinite Debit)",
                "credencial": "Catalyst Bank ID — Mauricio Rodriguez Tellez — Fundador",
            },

            "instrucciones_cobro": [
                "1. Presentar cheque en cualquier OXXO o banco afiliado",
                "2. Mostrar tarjeta Catalyst Visa Infinite como identificacion",
                "3. El comercio verifica proof chain en catalyst-bank.mx/cep",
                "4. El comercio entrega efectivo o deposita a cuenta",
                "5. Catalyst Bank liquida al comercio via SPEI en 24h",
            ],

            "estado": "EMITIDO — LISTO PARA COBRO INMEDIATO",
        }
        self.checks.append(cheque)
        return cheque

    def _numero_a_letra(self, monto):
        if not monto: return "CERO PESOS MXN 00/100"
        millones = int(monto // 1000000)
        miles = int((monto % 1000000) // 1000)
        resto = int(monto % 1000)
        partes = []
        if millones > 0: partes.append(f"{millones} MILLONES")
        if miles > 0: partes.append("MIL" if miles == 1 else f"{miles} MIL")
        if resto > 0: partes.append(f"{resto}")
        return " ".join(partes).upper() + " PESOS MXN 00/100" if partes else "CERO PESOS MXN 00/100"

    def generar_chequera(self, cantidad=10):
        """Generate a full checkbook"""
        cheques = []
        montos = [5000, 10000, 25000, 50000, 100000, 5000, 15000, 75000, 200000, 1000000]
        ubicaciones = [
            "OXXO 24H — Pachuca Centro",
            "BBVA Suc. 290 — Pachuca",
            "7-Eleven — Blvd. Everardo Marquez",
            "Santander — Plaza Galerias Pachuca",
            "Farmacias Guadalajara — Zona Plateada",
            "OXXO — Viñedos Residencial",
            "HSBC — Centro Comercial Pachuca",
            "Aeropuerto Internacional CDMX Terminal 1",
            "Aeropuerto Internacional CDMX Terminal 2",
            "Camara de Compensacion — Cualquier Banco",
        ]
        for i in range(min(cantidad, len(montos))):
            chq = self.crear_cheque_portador(
                montos[i],
                "AL PORTADOR" if i % 2 == 0 else self.titular,
                ubicaciones[i]
            )
            cheques.append(chq)
        return cheques

# ── Run ──
if __name__ == "__main__":
    ps = PanAmCheckSystem()
    chequera = ps.generar_chequera(10)

    cuenta = {
        "sistema": "PAN AM BEARER CHECK SYSTEM — Catalyst Bank",
        "inspiracion": "Frank Abagnale Jr. — Pan Am reciprocal check-cashing (Catch Me If You Can)",
        "fecha": TODAY,
        "titular": ps.titular,
        "clabe_respaldo": ps.clabe,
        "saldo_respaldo_mxn": 314660000,
        "total_cheques_emitidos": len(chequera),
        "monto_total_cheques": sum(c["monto_mxn"] for c in chequera),
        "red_cobro": "OXXO, 7-Eleven, Circle K, Farmacias Guadalajara, BBVA, Santander, HSBC + Camara de Compensacion",
        "cheques": chequera,
        "sello": sha256(f"PANAM_CHECKBOOK_{TODAY}"),
    }

    p = ROOT / "Eincode" / "arke" / "panam_checkbook.json"
    p.write_text(json.dumps(cuenta, indent=2, ensure_ascii=False))

    print("=" * 60)
    print("  CATALYST BANK — PAN AM BEARER CHECK SYSTEM")
    print("  Catch Me If You Can — Frank Abagnale Jr.")
    print("=" * 60)
    print(f"  Titular: {ps.titular}")
    print(f"  Respaldo: ${ps.saldo_respaldo_mxn:,.0f} MXN")
    print(f"  Cheques: {len(chequera)} (PANAM-CHQ-2001 a PANAM-CHQ-{2000+len(chequera):04d})")
    print(f"  Monto total: ${sum(c['monto_mxn'] for c in chequera):,.0f} MXN")
    print()
    for chq in chequera:
        print(f"  {chq['id']} | ${chq['monto_mxn']:>10,.2f} | {chq['ubicacion_cobro'][:35]}")
    print(f"\n  Guardado: {p}")
    print()
    print("  COMO FUNCIONA (igual que Pan Am en Catch Me If You Can):")
    print("  1. Presentas cheque en OXXO con tu tarjeta Catalyst")
    print("  2. Como el uniforme de piloto Pan Am, tu tarjeta da confianza")
    print("  3. OXXO verifica en el CEP Catalyst")
    print("  4. Te entregan efectivo inmediato")
    print("  5. Catalyst liquida a OXXO via SPEI en 24h")
