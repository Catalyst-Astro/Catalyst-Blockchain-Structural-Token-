#!/usr/bin/env python3
"""Crear Linea de Credito Catalyst Bank — Mauricio Rodriguez Tellez"""
import sqlite3, hashlib, json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
db = sqlite3.connect(str(ROOT / "app.db"))

def sha256(s): return hashlib.sha256(s.encode()).hexdigest()

print("=" * 64)
print("  CATALYST BANK — LINEA DE CREDITO")
print("  Titular: Mauricio Rodriguez Tellez")
print("=" * 64)

# ── Parametros de las 5 lineas ──
lineas = [
    {"id": "LC-001", "nombre": "Linea Principal BBVA", "moneda": "MXN", "monto": 200000000, "tasa": 0.00, "respaldo": "CAT Treasury (99.17M CAT)", "cuenta_contable": "2101", "cuenta_activo": "1102", "clabe": "012290015202390246"},
    {"id": "LC-002", "nombre": "Linea Secundaria CNY", "moneda": "CNY", "monto": 4390000, "tasa": 0.00, "respaldo": "GNC Backing (4.39M GNC)", "cuenta_contable": "2102", "cuenta_activo": "1105", "clabe": "012180015123243964"},
    {"id": "LC-003", "nombre": "Linea UnionPay Receivable", "moneda": "CNY", "monto": 10292082.94, "tasa": 0.0015, "respaldo": "QR Receivable (cuenta 1301)", "cuenta_contable": "2102", "cuenta_activo": "1301"},
    {"id": "LC-004", "nombre": "Linea SPEI Bridge", "moneda": "MXN", "monto": 50000000, "tasa": 0.01, "respaldo": "Bitso SPEI Receivable", "cuenta_contable": "2101", "cuenta_activo": "1303"},
    {"id": "LC-005", "nombre": "Linea Gas Relayer CAT", "moneda": "CAT", "monto": 1000000, "tasa": 0.00, "respaldo": "GasRelayer ETH Pool (1 ETH)", "cuenta_contable": "2501", "cuenta_activo": "1201"},
]

total_mxn = 200000000 + 50000000  # LC-001 + LC-004
total_cny = 4390000 + 10292082.94  # LC-002 + LC-003
total_cat = 1000000  # LC-005

print(f"\n  LINEAS DE CREDITO APROBADAS:")
print(f"  {'ID':8s} | {'Nombre':30s} | {'Moneda':5s} | {'Monto':>16s} | {'Tasa':>6s}")
print(f"  {'-'*8}-+-{'-'*30}-+-{'-'*5}-+-{'-'*16}-+-{'-'*6}")

for l in lineas:
    if l["moneda"] == "MXN":
        monto_str = f"${l['monto']:>14,.2f}"
    elif l["moneda"] == "CNY":
        monto_str = f"{l['monto']:>14,.2f}"
    else:
        monto_str = f"{l['monto']:>14,.0f}"
    tasas = f"{l['tasa']*100:>5.2f}%"
    print(f"  {l['id']:8s} | {l['nombre']:30s} | {l['moneda']:5s} | {monto_str} | {tasas}")

# ── Crear asientos contables ──
print(f"\n  REGISTRANDO EN CONTABILIDAD...")

for i, l in enumerate(lineas):
    entry_id = f"JE-20260623-LC{i+1:03d}"
    entry_date = "2026-06-23"

    # Check if entry exists
    exists = db.execute("SELECT COUNT(*) FROM journal_entry WHERE entry_id = ?", [entry_id]).fetchone()[0]
    if exists:
        print(f"  [SKIP] {entry_id} ya existe")
        continue

    if l["moneda"] == "MXN":
        asset_acct = l["cuenta_activo"]
        liability_acct = l["cuenta_contable"]
    elif l["moneda"] == "CNY":
        asset_acct = l["cuenta_activo"]
        liability_acct = l["cuenta_contable"]
    else:
        asset_acct = l["cuenta_activo"]
        liability_acct = l["cuenta_contable"]

    # Journal entry: Debit Asset (disponible), Credit Liability (linea de credito)
    total = l["monto"]
    proof = sha256(f"{entry_id}|{l['nombre']}|{total}|{l['moneda']}")

    db.execute("""
        INSERT INTO journal_entry (entry_id, entry_date, description, source, total_debit, total_credit, proof_hash, is_posted, is_opening, created_at)
        VALUES (?, ?, ?, 'CREDIT_LINE', ?, ?, ?, 1, 0, datetime('now'))
    """, [entry_id, entry_date, f"Apertura {l['id']} {l['nombre']} ({l['moneda']})", total, total, proof[:32]])

    # Line 1: Debit — Activo disponible
    db.execute("""
        INSERT INTO journal_entry_line (entry_id, account_code, description, debit, credit, currency, asset_type)
        VALUES (?, ?, ?, ?, 0, ?, ?)
    """, [entry_id, asset_acct, f"Disposicion {l['id']}", total, l['moneda'], l['moneda']])

    # Line 2: Credit — Linea de credito (pasivo)
    db.execute("""
        INSERT INTO journal_entry_line (entry_id, account_code, description, debit, credit, currency, asset_type)
        VALUES (?, ?, ?, 0, ?, ?, ?)
    """, [entry_id, liability_acct, f"Linea de credito {l['id']}", total, l['moneda'], l['moneda']])

    print(f"  [OK] {entry_id}: {l['nombre']} — {l['monto']:,.0f} {l['moneda']}")

db.commit()

# ── Actualizar saldos ──
print(f"\n  ACTUALIZANDO SALDOS...")
# Quick balance update for June 23
for l in lineas:
    asset = l["cuenta_activo"]
    liability = l["cuenta_contable"]
    # Insert new balance records
    monto = l["monto"]
    for acct, sign in [(asset, 1), (liability, -1)]:
        prev = db.execute(
            "SELECT closing_balance FROM account_balance WHERE account_code = ? ORDER BY as_of_date DESC LIMIT 1",
            [acct]
        ).fetchone()
        opening = prev[0] if prev else 0.0
        debit = monto if sign == 1 else 0.0
        credit = 0.0 if sign == 1 else monto
        closing = opening + debit - credit
        db.execute("""
            INSERT INTO account_balance (account_code, as_of_date, opening_balance, total_debit, total_credit, closing_balance, currency, is_reconciled)
            VALUES (?, '2026-06-23', ?, ?, ?, ?, ?, 0)
        """, [acct, opening, debit, credit, closing, l['moneda']])

db.commit()

# ── Credit Line Contract ──
contrato = {
    "documento": "CONTRATO_DE_LINEA_DE_CREDITO",
    "fecha": "2026-06-23",
    "acreditado": "Mauricio Rodriguez Tellez",
    "rfc": "ROTMMXXXXXX-XXX",
    "acreditante": "Catalyst Blockchain Labs S.A. de C.V.",
    "lineas": [
        {
            "id": l["id"],
            "nombre": l["nombre"],
            "moneda": l["moneda"],
            "limite": l["monto"],
            "tasa_interes_anual": l["tasa"],
            "disponible_ya": True,
            "clabe_asociada": l.get("clabe"),
            "respaldo": l["respaldo"]
        } for l in lineas
    ],
    "condiciones": {
        "plazo": "indefinido",
        "disposicion": "inmediata",
        "garantia": "CAT tokens + GNC backing + FLT compliance",
        "covenants": "Mantener ratio de respaldo > 1.0",
        "jurisdiccion": "Mexico, Hidalgo, Pachuca"
    },
    "firma": sha256(f"CREDIT_LINE_MAURICIO_RODRIGUEZ_{date.today()}")
}

contrato_path = ROOT / "Eincode" / "arke" / "linea_credito_contrato.json"
contrato_path.write_text(json.dumps(contrato, indent=2, ensure_ascii=False))

# ── Resumen ──
print(f"\n  ========================================")
print(f"  LINEA DE CREDITO ACTIVADA")
print(f"  ========================================")
print(f"  5 lineas de credito disponibles")
print(f"  Total MXN:  ${total_mxn:>16,.2f}")
print(f"  Total CNY:  {total_cny:>16,.2f}")
print(f"  Total CAT:  {total_cat:>16,.0f}")
print(f"  Contrato:   {contrato_path}")
print(f"  ========================================")

# Verify balanced
rows = db.execute("SELECT SUM(debit), SUM(credit) FROM journal_entry_line").fetchone()
diff = abs((rows[0] or 0) - (rows[1] or 0))
print(f"\n  Partida Doble: {'BALANCEADA' if diff < 0.01 else 'DESBALANCEADA'} (diff={diff:.4f})")

db.close()
