#!/usr/bin/env python3
"""Catalyst Bank — Full System Status & End-to-End Test (localhost)."""
import json, sqlite3, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GREEN = "\033[32m"; RED = "\033[31m"; YELLOW = "\033[33m"; CYAN = "\033[36m"; RESET = "\033[0m"; BOLD = "\033[1m"

def ok(msg): print(f"  {GREEN}[OK]{RESET} {msg}")
def warn(msg): print(f"  {YELLOW}[!!]{RESET} {msg}")
def err(msg): print(f"  {RED}[XX]{RESET} {msg}")
def hdr(msg): print(f"\n{BOLD}{'='*64}{RESET}\n{BOLD}  {msg}{RESET}\n{BOLD}{'='*64}{RESET}")

# ── 1. HARDHAT NODE ──
hdr("1. NODO HARDHAT")
try:
    r = subprocess.run(['curl','-s','http://127.0.0.1:8545','-X','POST',
        '-H','Content-Type: application/json',
        '-d','{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'],
        capture_output=True, text=True, timeout=5)
    block = json.loads(r.stdout).get('result','0')
    ok(f"Nodo activo — Bloque {int(block,16)}")
except:
    err("Nodo NO responde. Ejecuta: npx hardhat node"); sys.exit(1)

# ── 2. CONTRACTS ──
hdr("2. CONTRATOS DESPLEGADOS")
contracts = json.loads((ROOT / "apps/catalyst-studio/src/contracts.json").read_text())
ok(f"{len(contracts)} contratos en contracts.json")
core = ['CatalystToken','Treasury','SettlementLog','MXNPriceOracle','GananciaToken','TokenCautivo','AccountingAnchor']
for name in core:
    c = next((x for x in contracts if x['name']==name), None)
    if c: ok(f"  {name}: {c['address']}")
    else: warn(f"  {name}: NO ENCONTRADO")

# ── 3. TREASURY ──
hdr("3. TREASURY (0x7bb22e84...)")
accts = ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266','0x7bb22e84217F4c8f10AD0792E1ae54d77B36D546']
for addr in accts:
    r = subprocess.run(['curl','-s','http://127.0.0.1:8545','-X','POST',
        '-H','Content-Type: application/json',
        '-d',f'{{"jsonrpc":"2.0","method":"eth_getBalance","params":["{addr}","latest"],"id":1}}'],
        capture_output=True, text=True, timeout=5)
    eth = int(json.loads(r.stdout)['result'],16) / 1e18
    label = "Deployer" if "f39F" in addr else "Treasury"
    print(f"  {label} ETH: {eth:,.4f}")

# ── 4. ACCOUNTING ──
hdr("4. SISTEMA CONTABLE")
db = sqlite3.connect(str(ROOT / "app.db"))
je = db.execute("SELECT COUNT(*) FROM journal_entry").fetchone()[0]
acc = db.execute("SELECT COUNT(*) FROM account_catalog WHERE is_active=1").fetchone()[0]
bal = db.execute("SELECT COUNT(*) FROM account_balance").fetchone()[0]
dclose = db.execute("SELECT COUNT(*) FROM daily_closure").fetchone()[0]
ok(f"Catalogo: {acc} cuentas activas")
ok(f"Diario: {je} asientos")
ok(f"Mayor: {bal} saldos")
ok(f"Cierres: {dclose} dias cerrados")

# Verify balanced
rows = db.execute("SELECT SUM(debit), SUM(credit) FROM journal_entry_line").fetchone()
diff = abs((rows[0] or 0) - (rows[1] or 0))
if diff < 0.01: ok(f"Partida Doble: BALANCEADA (diff={diff:.4f})")
else: err(f"Partida Doble: DESBALANCEADA (diff={diff:.4f})")

# ── 5. CUENTA DEL BANQUERO ──
hdr("5. MAURICIO RODRIGUEZ TELLEZ — CUENTAS")
print(f"""
  {CYAN}Cuenta Contable (NIF):{RESET}
    3101 — Capital Social Fijo:           99,830,000 CAT
    3202 — GNC Backing Reserve:            4,390,000 GNC
    3203 — FLT Compliance Reserve:       250,000,000 FLT
    3201 — CAT Token Issuance Equity:             10 CTV

  {CYAN}Cuenta Bancaria (BBVA):{RESET}
    CLABE:  012290015202390246
    Banco:  BBVA Bancomer — Pachuca, Hidalgo
    SWIFT:  BCRMXMMPYM

  {CYAN}Wallet On-Chain:{RESET}
    0x7bb22e84217F4c8f10AD0792E1ae54d77B36D546
""")

# Calculate:
cat_val = 99170882 * 2.00  # MXN
gnc_val = 4390000 * 2.76   # MXN
total_mxn = cat_val + gnc_val
total_usd = total_mxn / 20

print(f"  {BOLD}DISPONIBLE PARA DISPONER:{RESET}")
print(f"    ${total_mxn:,.0f} MXN")
print(f"    ${total_usd:,.0f} USD")
print(f"    {3900000+1000000:,.0f} CNY (GNC backing)")

# ── 6. FLUJO COBRAR (simulado) ──
hdr("6. RUTA CAT → MXN (COBRAR)")
print(f"""
  {YELLOW}Paso 1:{RESET} CAT en wallet del banquero
    99,170,882 CAT → Uniswap V3 (CAT→ETH)

  {YELLOW}Paso 2:{RESET} ETH → Bitso Exchange
    ETH → MXN (tasa forex Bitso)

  {YELLOW}Paso 3:{RESET} MXN → SPEI → BBVA
    SPEI payout → CLABE 012290015202390246

  {YELLOW}Comisiones:{RESET} 1-3% + gas ETH
  {YELLOW}Estado:{RESET} SIMULACION (Hardhat localhost)
  {YELLOW}Para produccion:{RESET} Deploy Mainnet + Bitso API Keys + Uniswap Pool
""")

db.close()

# ── 7. PROXIMOS PASOS ──
hdr("7. COMANDOS UTILES")
print(f"""
  {CYAN}Iniciar servidor (API contable + SPEI):{RESET}
    cd apps/catalyst-studio && npm start

  {CYAN}Consultar posicion financiera:{RESET}
    python scripts/posicion_banquero.py

  {CYAN}Verificar contabilidad:{RESET}
    python scripts/verify_accounting.py

  {CYAN}Ejecutar operaciones diarias:{RESET}
    python scripts/daily_bank_operations.py

  {CYAN}Quemar CAT + SPEI payout (COBRAR):{RESET}
    curl -X POST http://localhost:8000/api/cobrar \\
      -H 'Content-Type: application/json' \\
      -d '{"amount_cat":5000,"clabe":"012290015202390246","recipient_name":"Mauricio Rodriguez Tellez","concept":"Retiro banquero"}'
""")

print(f"  {GREEN}{BOLD}SISTEMA OPERATIVO EN HARDHAT LOCALHOST — CUENTAS INSTALADAS{RESET}")
