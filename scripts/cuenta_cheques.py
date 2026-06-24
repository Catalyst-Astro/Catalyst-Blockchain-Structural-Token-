#!/usr/bin/env python3
"""Catalyst Bank — Cuenta de Cheques + Chequera Digital"""
import json, hashlib, sqlite3
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "app.db"

def sha256(s): return hashlib.sha256(s.encode()).hexdigest()

class CuentaCheques:
    def __init__(self):
        self.today = date.today().isoformat()
        self.db = sqlite3.connect(str(DB)) if DB.exists() else None

    def crear_cuenta(self):
        """Create checking account with CLABE"""
        cuenta = {
            "tipo": "CUENTA DE CHEQUES",
            "numero_cuenta": "01520239024",
            "clabe": "012290015202390246",
            "banco": "BBVA Bancomer — Suc. 290 Pachuca",
            "titular": "Mauricio Rodriguez Tellez",
            "rfc": "ROTMMXXXXXX-XXX",
            "moneda": "MXN",
            "saldo": 79200000.00,
            "fecha_apertura": self.today,
            "numero_chequera": "CHQ-001",
            "cheques_emitidos": [],
            "cheques_disponibles": 50,
            "folio_inicial": 1001,
            "folio_final": 1050,
        }
        return cuenta

    def emitir_cheque(self, monto, beneficiario, concepto, numero_cheque):
        """Generate a check"""
        cheque = {
            "id": f"CHQ-{numero_cheque:04d}",
            "numero": numero_cheque,
            "fecha": self.today,
            "monto_mxn": monto,
            "monto_letra": self._numero_a_letra(monto),
            "beneficiario": beneficiario,
            "concepto": concepto,
            "clabe_emisor": "012290015202390246",
            "banco_emisor": "BBVA Bancomer — Suc. 290 Pachuca",
            "titular_emisor": "Mauricio Rodriguez Tellez",
            "rfc_emisor": "ROTMMXXXXXX-XXX",
            "firma_sha256": sha256(f"CHQ{numero_cheque}{monto}{beneficiario}{self.today}"),
            "status": "EMITIDO",
            "cobrable_en": "Cualquier banco via Camara de Compensacion",
            "leyenda": "Cheque pagadero a la vista. Valido por 180 dias desde su emision.",
        }
        return cheque

    def _numero_a_letra(self, monto):
        """Convert number to Spanish words (simplified)"""
        unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
        decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
        especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"]
        centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

        millones = int(monto // 1000000)
        resto = int(monto % 1000000)
        miles = int(resto // 1000)
        cientos = int(resto % 1000)

        partes = []
        if millones > 0:
            partes.append(f"{unidades[millones]} MILLONES" if millones < 10 else f"{millones} MILLONES")
        if miles > 0:
            if miles == 1: partes.append("MIL")
            else: partes.append(f"{unidades[miles]} MIL" if miles < 10 else f"{miles} MIL")
        if cientos > 0:
            c = int(cientos // 100)
            d = int((cientos % 100) // 10)
            u = int(cientos % 10)
            if c > 0: partes.append(centenas[c] if c > 1 or (d==0 and u==0) else "CIEN")
            if d == 1: partes.append(especiales[u])
            elif d > 1: partes.append(f"{decenas[d]}" + (f" Y {unidades[u]}" if u > 0 else ""))
            elif u > 0: partes.append(unidades[u])

        return " ".join(partes) + " PESOS MXN 00/100" if partes else "CERO PESOS MXN 00/100"

# ── Run ──
if __name__ == "__main__":
    cc = CuentaCheques()
    cuenta = cc.crear_cuenta()

    # Generate sample checks
    cheques = []
    for i, (monto, ben, con) in enumerate([
        (5000, "Walmart Mexico", "Compra suministros"),
        (12500, "Proveedor Tech SA de CV", "Servicios cloud"),
        (3500, "CFE Suministrador", "Luz oficina Moscato 185"),
        (1000000, "Catalyst Blockchain Labs", "Aportacion capital"),
        (50000, "Despacho Juridico Asociado", "Honorarios legales"),
    ]):
        chq = cc.emitir_cheque(monto, ben, con, 1001 + i)
        cheques.append(chq)

    cuenta["cheques_emitidos"] = cheques
    cuenta["cheques_disponibles"] = 50 - len(cheques)

    # Save
    p = ROOT / "Eincode" / "arke" / "cuenta_cheques.json"
    p.write_text(json.dumps(cuenta, indent=2, ensure_ascii=False))

    print("=" * 55)
    print("  CATALYST BANK — CUENTA DE CHEQUES")
    print("=" * 55)
    print(f"  CLABE:    {cuenta['clabe']}")
    print(f"  Titular:  {cuenta['titular']}")
    print(f"  Saldo:    ${cuenta['saldo']:,.2f} MXN")
    print(f"  Chequera: {cuenta['numero_chequera']}")
    print(f"  Cheques:  {cuenta['folio_inicial']} — {cuenta['folio_final']}")
    print(f"  Emitidos: {len(cheques)}")
    print(f"  Disponibles: {cuenta['cheques_disponibles']}")
    print()
    for chq in cheques:
        print(f"  {chq['id']} | ${chq['monto_mxn']:>12,.2f} | {chq['beneficiario'][:30]}")
    print(f"\n  Guardado: {p}")
