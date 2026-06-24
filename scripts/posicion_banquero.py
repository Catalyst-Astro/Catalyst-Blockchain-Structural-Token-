#!/usr/bin/env python3
"""Catalyst Bank — Posicion Financiera del Banquero (ASCII-safe)."""
import sqlite3, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
db = sqlite3.connect(str(ROOT / "app.db"))

print("=" * 64)
print("  CATALYST BANK — POSICION FINANCIERA DEL BANQUERO")
print("  Mauricio Rodriguez Tellez — Dueño del Banco")
print("=" * 64)

# 1. On-chain treasury
treasury = json.loads((ROOT / "Eincode/arke/treasury_wallet_100m.json").read_text(encoding="utf-8"))
print("\n--- 1. TREASURY ON-CHAIN (0x7bb22e84...) ---")
for token, amount in treasury["balances"].items():
    print(f"  {token:6s}: {amount}")

# 2. Accounting balances
print("\n--- 2. SALDOS CONTABLES (al 2026-06-22) ---")
bals = db.execute("""
    SELECT ab.account_code, ac.name, ac.type, ab.closing_balance
    FROM account_balance ab
    JOIN account_catalog ac ON ab.account_code = ac.code
    WHERE ab.id IN (SELECT MAX(id) FROM account_balance GROUP BY account_code)
    AND ABS(ab.closing_balance) > 0.01
    ORDER BY ab.account_code
""").fetchall()

activos = {}; pasivos = {}; capital = {}; ingresos = {}; gastos = {}
for b in bals:
    val = b[3]; name = b[1]
    if b[2] == 'A': activos[name] = val
    elif b[2] == 'L': pasivos[name] = abs(val)
    elif b[2] == 'E': capital[name] = abs(val)
    elif b[2] == 'I': ingresos[name] = abs(val)
    elif b[2] == 'X': gastos[name] = val

print("\n  ACTIVOS (lo que posee el banco):")
for name, val in activos.items():
    print(f"    {name[:48]:48s} {val:>14,.2f}")
ta = sum(activos.values())
print(f"    {'TOTAL ACTIVOS':>48s} {ta:>14,.2f}")

print("\n  PASIVOS (obligaciones):")
for name, val in pasivos.items():
    print(f"    {name[:48]:48s} {val:>14,.2f}")
tl = sum(pasivos.values())
print(f"    {'TOTAL PASIVOS':>48s} {tl:>14,.2f}")

print("\n  CAPITAL (patrimonio):")
for name, val in capital.items():
    print(f"    {name[:48]:48s} {val:>14,.2f}")
tc = sum(capital.values())
print(f"    {'TOTAL CAPITAL':>48s} {tc:>14,.2f}")

ti = sum(ingresos.values())
tg = sum(gastos.values())
neto = ti - tg
print(f"\n  INGRESOS ACUMULADOS: {ti:>16,.2f}")
print(f"  GASTOS ACUMULADOS:   {tg:>16,.2f}")
print(f"  RESULTADO NETO:      {neto:>16,.2f} ({'UTILIDAD' if neto >= 0 else 'PERDIDA'})")

pn = tc + neto
print(f"\n  PATRIMONIO NETO DEL BANQUERO: {pn:>14,.2f}")

# 3. Disponibilidad
print("\n" + "-" * 64)
print("  DISPONIBILIDAD INMEDIATA")
print("-" * 64)

cat_val = activos.get("CAT Token - Treasury Holdings", 0)
gnc_val = activos.get("GNC Token - Ganancia (1:1 CNY)", 0)
ctv_val = activos.get("CTV Token - Cautivo (Libre Usanza)", 0)

cat_mxn = cat_val * 2.00
cat_usd = cat_val * 0.10
gnc_cny = gnc_val
gnc_mxn = gnc_val * 2.76

print(f"""
  CAT en Treasury:      {cat_val:>14,.0f} tokens
    Valor @ $2.00 MXN:  {cat_mxn:>14,.2f} MXN
    Valor @ $0.10 USD:  {cat_usd:>14,.2f} USD

  GNC en Treasury:      {gnc_val:>14,.0f} tokens (1 GNC = 1 CNY)
    Valor CNY:          {gnc_cny:>14,.2f} CNY
    Valor MXN (x2.76):  {gnc_mxn:>14,.2f} MXN

  CTV Libre Usanza:     {ctv_val:>14,.0f} tokens
    (1 CTV = 1,000 GNC, convertible a fiat via SWIFT)

  ------------------------------
  TOTAL DISPONIBLE MXN: {cat_mxn + gnc_mxn:>14,.2f} MXN
  TOTAL DISPONIBLE USD: {(cat_mxn + gnc_mxn) / 20:>14,.2f} USD
  ------------------------------
""")

# 4. Oracle rates
daily22 = json.loads((ROOT / "Eincode/arke/daily_report_2026-06-22.json").read_text(encoding="utf-8"))
oracle = daily22.get("oracle", {})
print("-" * 64)
print("  TASAS ORACLE (4-Pillar Pareto)")
print("-" * 64)
print(f"  CAT/USD: {oracle.get('cat_usd', '?')}")
print(f"  USD/MXN: {oracle.get('usd_mxn', '?')}")
print(f"  CAT/MXN: {oracle.get('cat_mxn', '?')}")
print(f"  CAT/CNY: {oracle.get('cat_cny', '?')}")

# 5. Cuenta del banquero
print("\n" + "-" * 64)
print("  CUENTA ASIGNADA AL BANQUERO")
print("-" * 64)
print("""
  Titular:    Mauricio Rodriguez Tellez
  RFC:        ROTMXXXXXX-XXX
  Banco:      BBVA Bancomer - Pachuca, Hidalgo
  CLABE:      012290015202390246 (Cuenta Puente Principal)
  SWIFT BIC:  BCRMXMMPYM
  Cuenta NIF: 3101 — Capital Social Fijo

  Estructura patrimonial:
    99,830,000 CAT = Capital Social Fijo (cuenta 3101)
     4,390,000 GNC = GNC Backing Reserve (cuenta 3202)
   250,000,000 FLT = FLT Compliance Reserve (cuenta 3203)
            10 CTV = CAT Token Issuance Equity (cuenta 3201)

  Resultado del periodo (17-22 Jun):
    Ingresos: +16,600.62 (comisiones QR + SPEI)
    Gastos:   -659,118.00 (quema deflacionaria CAT)
    Neto:     -642,517.38 (perdida contable por quema)

  NOTA: La \"perdida\" es contable — la quema de CAT es el
  mecanismo deflacionario del 5% que incrementa el valor
  del token remanente. No es perdida real, es inversion
  en apreciacion del activo.
""")

# 6. Resumen final
print("=" * 64)
print("  RESUMEN: DINERO DISPONIBLE PARA EL BANQUERO")
print("=" * 64)
print(f"""
  Activos totales:       {ta:>16,.2f}
  Pasivos totales:       {tl:>16,.2f}
  Patrimonio neto:       {pn:>16,.2f}

  Liquido inmediato:
    CAT (99.17M tokens): $198,341,764 MXN / $9,917,088 USD
    GNC (4.39M tokens):   $12,116,400 MXN / ¥4,390,000 CNY
    Total liquido:        $210,458,164 MXN / $10,522,908 USD

  Ruta para convertir a pesos reales:
    CAT -> Uniswap V3 (CAT->ETH) -> Bitso (ETH->MXN) -> SPEI -> BBVA CLABE 012290015202390246
    Comisiones: 1-3% + gas ETH
    Estado actual: SIMULACION (Hardhat localhost)
""")

db.close()
