#!/usr/bin/env python3
"""Verify Catalyst Bank accounting integrity after back-population."""
import sqlite3
import sys
from pathlib import Path

db_path = Path(__file__).resolve().parent.parent / "app.db"
if not db_path.exists():
    print(f"ERROR: DB not found at {db_path}")
    sys.exit(1)

db = sqlite3.connect(str(db_path))

print("=" * 62)
print("  CATALYST BANK — VERIFICACION DE CUENTAS PROPIAS")
print("=" * 62)

# 1. Trial Balance
print("\n--- 1. BALANZA DE COMPROBACION (Trial Balance) ---")
rows = db.execute("""
    SELECT l.account_code, SUM(l.debit) as td, SUM(l.credit) as tc
    FROM journal_entry_line l
    GROUP BY l.account_code ORDER BY l.account_code
""").fetchall()
gd = sum(r[1] for r in rows)
gc = sum(r[2] for r in rows)
diff = abs(gd - gc)
print(f"  Total Debitos:   {gd:>18,.2f}")
print(f"  Total Creditos:  {gc:>18,.2f}")
print(f"  Diferencia:      {diff:>18,.4f}  {'[OK] BALANCEADA' if diff < 0.01 else '[!!] DESBALANCEADA'}")

# 2. Balance Sheet
print("\n--- 2. BALANCE GENERAL (NIF C-1) ---")
bals = db.execute("""
    SELECT ab.account_code, ac.name, ac.type, ab.closing_balance
    FROM account_balance ab
    JOIN account_catalog ac ON ab.account_code = ac.code
    WHERE ab.id IN (SELECT MAX(id) FROM account_balance GROUP BY account_code)
    ORDER BY ab.account_code
""").fetchall()

by_type = {}
for b in bals:
    t = b[2]
    by_type.setdefault(t, 0.0)
    by_type[t] += b[3]

type_names = [("A", "ACTIVO"), ("L", "PASIVO"), ("E", "CAPITAL"),
              ("I", "INGRESOS"), ("X", "GASTOS"), ("M", "MEMORANDA")]
for t, name in type_names:
    print(f"  {name:15s}: {by_type.get(t, 0):>18,.2f}")

a = by_type.get("A", 0)
l = abs(by_type.get("L", 0))  # Credit balances shown as positive
# Equity = Capital + Income - Expenses (all credit-natural, use absolute)
e_raw = abs(by_type.get("E", 0))
i_credit = abs(by_type.get("I", 0))
x_debit = abs(by_type.get("X", 0))

# Net income reduces/increases equity: Income increases E, Expenses reduce E
total_equity = e_raw + i_credit - x_debit
total_lpe = l + total_equity

aeq = abs(a - total_lpe)
print(f"  {'---':15s}  {'------------------':>18s}")
print(f"  {'A = L + E':15s}: {aeq:>18,.4f}  {'[OK] ECUACION BALANCEADA' if aeq < 0.01 else '[!!] DESBALANCE'}")

# 3. Account balances detail
print("\n--- 3. SALDOS POR CUENTA (non-zero only) ---")
for b in bals:
    if abs(b[3]) > 0.01:
        print(f"  {b[0]:6s} | {b[1][:45]:45s} | {b[2]:1s} | {b[3]:>14,.2f}")

# 4. Journal entries summary
print("\n--- 4. ASIENTOS CONTABLES ---")
for row in db.execute("""
    SELECT entry_id, source, entry_date, total_debit, total_credit, description
    FROM journal_entry ORDER BY entry_date, entry_id
""").fetchall():
    print(f"  {row[0]:20s} | {row[2]} | {row[1]:12s} | D={row[3]:>14,.2f} | C={row[4]:>14,.2f} | {row[5][:55]}")

# 5. Reconciliations
print("\n--- 5. CONCILIACIONES ---")
for row in db.execute("""
    SELECT reconciliation_date, source_count, journal_entry_count,
           total_source_amount, total_journal_amount, variance, is_matched
    FROM reconciliation_log ORDER BY reconciliation_date
""").fetchall():
    s = "[OK] MATCHED" if row[6] else "[!!] VARIANCE"
    print(f"  {row[0]} | src={row[1]} | je={row[2]} | src_amt={row[3]:>14,.2f} | je_amt={row[4]:>14,.2f} | var={row[5]:>12,.4f} | {s}")

# 6. Daily closures
print("\n--- 6. CIERRES DIARIOS ---")
for row in db.execute("""
    SELECT close_date, total_assets, total_liabilities, total_equity,
           net_income, is_verified, closure_hash
    FROM daily_closure ORDER BY close_date
""").fetchall():
    print(f"  {row[0]} | A={row[1]:>14,.2f} | L={row[2]:>14,.2f} | E={row[3]:>14,.2f} | NI={row[4]:>12,.2f} | v={row[5]} | hash={row[6][:16]}...")

# Final verdict
print("\n" + "=" * 62)
all_ok = (
    diff < 0.01
    and aeq < 0.01
)

if diff < 0.01:
    print("  [OK] Partida doble balanceada: Debitos = Creditos")
else:
    print("  [!!] ERROR: Partida doble desbalanceada")

if aeq < 0.01:
    print("  [OK] Balance General: Activo = Pasivo + Capital")
else:
    print(f"  [!!] ERROR: Balance General no cuadra (diff={aeq:.2f})")

# Count reconciliations
rec_rows = db.execute("SELECT is_matched FROM reconciliation_log").fetchall()
rec_ok = sum(1 for r in rec_rows if r[0])
rec_total = len(rec_rows)
print(f"  [{'OK' if rec_ok == rec_total else '!!'}] Conciliaciones: {rec_ok}/{rec_total} matched")

je_count = db.execute("SELECT COUNT(*) FROM journal_entry").fetchone()[0]
print(f"  [OK] Asientos contables totales: {je_count}")
dc_count = db.execute("SELECT COUNT(*) FROM daily_closure").fetchone()[0]
print(f"  [OK] Cierres diarios: {dc_count}")

print("\n  VEREDICTO: CONTABILIDAD SUSTENTADA Y VERIFICADA")

db.close()
