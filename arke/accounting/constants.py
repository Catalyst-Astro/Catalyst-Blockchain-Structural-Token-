"""Catalyst Bank — Chart of Accounts Constants (NIF-aligned, 58 cuentas)."""

from typing import Dict, List, Optional, TypedDict


class AccountDef(TypedDict):
    code: str
    name: str
    type: str  # A=Asset L=Liability E=Equity I=Income X=Expense M=Memorandum
    natural_balance: str  # D=Debit C=Credit
    level: int  # 1=Grupo 2=Mayor 3=Subcuenta
    parent_code: Optional[str]
    description: str
    bank_details: Optional[dict]


# ── 1000 ACTIVO ─────────────────────────────────────────
ACTIVO_ACCOUNTS: List[AccountDef] = [
    # 1100 Efectivo y Equivalentes
    {"code": "1100", "name": "Efectivo y Equivalentes", "type": "A", "natural_balance": "D", "level": 1, "parent_code": "1000", "description": "Grupo: Caja, Bancos, Custodia", "bank_details": None},
    {"code": "1101", "name": "Caja", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1100", "description": "Efectivo en oficina", "bank_details": None},
    {"code": "1102", "name": "BBVA CLABE Principal - 012290015202390246", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1100", "description": "Cuenta puente BBVA Pachuca", "bank_details": {"bank": "BBVA Bancomer", "clabe": "012290015202390246", "plaza": "Pachuca, Hidalgo", "swift_bic": "BCRMXMMPYM"}},
    {"code": "1103", "name": "BBVA CLABE Secundaria - 012180015123243964", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1100", "description": "Cuenta puente secundaria BBVA", "bank_details": {"bank": "BBVA Bancomer", "clabe": "012180015123243964", "swift_bic": "BCRMXMMPYM"}},
    {"code": "1104", "name": "Bitso SPEI Custody", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1100", "description": "Fondos en custodia Bitso para SPEI", "bank_details": {"provider": "Bitso Business API", "mode": "SPEI"}},
    {"code": "1105", "name": "CNY Reserve Treasury", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1100", "description": "Reserva en CNY del treasury", "bank_details": None},

    # 1200 Activos Digitales
    {"code": "1200", "name": "Activos Digitales", "type": "A", "natural_balance": "D", "level": 1, "parent_code": "1000", "description": "Grupo: Tokens en treasury", "bank_details": None},
    {"code": "1201", "name": "CAT Token - Treasury Holdings", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1200", "description": "Catalyst Token en treasury 0x7bb22e84...", "bank_details": {"token": "CAT", "address": "0xefAB0Beb..."}},
    {"code": "1202", "name": "GNC Token - Ganancia (1:1 CNY)", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1200", "description": "Ganancia Token backing 1:1 CNY", "bank_details": {"token": "GNC", "address": "0xc0Bb1650..."}},
    {"code": "1203", "name": "FLT Token - Fractal Compliance", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1200", "description": "Fractal Liquidity Token", "bank_details": {"token": "FLT", "address": "0x70bDA08D..."}},
    {"code": "1204", "name": "CTV Token - Cautivo (Libre Usanza)", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1200", "description": "Token Cautivo para retiro fiat", "bank_details": {"token": "CTV", "address": "0x90c84237..."}},
    {"code": "1205", "name": "FRT Token - Inflationary Reward", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1200", "description": "Fractal Reward Token", "bank_details": {"token": "FRT", "address": "0xaca81583..."}},
    {"code": "1206", "name": "AIM Token - AI Module", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1200", "description": "AI Module token (minted on demand)", "bank_details": {"token": "AIM", "address": "0x26B862f6..."}},

    # 1300 Cuentas por Cobrar
    {"code": "1300", "name": "Cuentas por Cobrar", "type": "A", "natural_balance": "D", "level": 1, "parent_code": "1000", "description": "Grupo: Receivables", "bank_details": None},
    {"code": "1301", "name": "UnionPay QR Settlement Receivable", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1300", "description": "Liquidaciones QR pendientes UnionPay 95516", "bank_details": {"provider": "UnionPay China", "bic": "UNPYCNBH"}},
    {"code": "1302", "name": "SWIFT Transfer Receivable", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1300", "description": "Transferencias SWIFT MT103 pendientes", "bank_details": None},
    {"code": "1303", "name": "Bitso SPEI Receivable", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1300", "description": "Pagos SPEI en tránsito vía Bitso", "bank_details": None},
    {"code": "1304", "name": "Service Fees Receivable", "type": "A", "natural_balance": "D", "level": 3, "parent_code": "1300", "description": "Comisiones por servicios pendientes de cobro", "bank_details": None},
]

# ── 2000 PASIVO ─────────────────────────────────────────
PASIVO_ACCOUNTS: List[AccountDef] = [
    {"code": "2100", "name": "Depósitos de Clientes", "type": "L", "natural_balance": "C", "level": 1, "parent_code": "2000", "description": "Grupo: Customer deposits", "bank_details": None},
    {"code": "2101", "name": "Customer MXN Deposits", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2100", "description": "Depósitos en MXN de clientes", "bank_details": None},
    {"code": "2102", "name": "Customer CNY Deposits", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2100", "description": "Depósitos en CNY de clientes", "bank_details": None},

    {"code": "2200", "name": "Obligaciones de Liquidación", "type": "L", "natural_balance": "C", "level": 1, "parent_code": "2000", "description": "Grupo: Settlement obligations", "bank_details": None},
    {"code": "2201", "name": "SWIFT Pending Settlement - USD", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2200", "description": "MT103 pendientes de liquidar", "bank_details": None},
    {"code": "2202", "name": "SPEI Pending Settlement - MXN", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2200", "description": "Pagos SPEI pendientes", "bank_details": None},
    {"code": "2203", "name": "GNC Redemption Liability (1:1 CNY)", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2200", "description": "Pasivo por GNC emitido (1 GNC = 1 CNY redeemable)", "bank_details": None},

    {"code": "2300", "name": "Cuentas por Pagar", "type": "L", "natural_balance": "C", "level": 1, "parent_code": "2000", "description": "Grupo: Accounts payable", "bank_details": None},
    {"code": "2301", "name": "UnionPay Fees Payable", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2300", "description": "Comisiones UnionPay por pagar", "bank_details": None},
    {"code": "2302", "name": "SWIFT Network Fees Payable", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2300", "description": "Comisiones red SWIFT por pagar", "bank_details": None},
    {"code": "2303", "name": "Service Provider Payable", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2300", "description": "Proveedores de servicios por pagar", "bank_details": None},

    {"code": "2400", "name": "Pasivos Fiscales", "type": "L", "natural_balance": "C", "level": 1, "parent_code": "2000", "description": "Grupo: Tax liabilities", "bank_details": None},
    {"code": "2401", "name": "IVA Payable", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2400", "description": "IVA trasladado por pagar (16%)", "bank_details": None},
    {"code": "2402", "name": "ISR Payable", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2400", "description": "ISR por pagar (30%)", "bank_details": None},

    {"code": "2500", "name": "Pasivos Acumulados", "type": "L", "natural_balance": "C", "level": 1, "parent_code": "2000", "description": "Grupo: Accrued liabilities", "bank_details": None},
    {"code": "2501", "name": "Accrued Expenses", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2500", "description": "Gastos acumulados por pagar", "bank_details": None},
    {"code": "2502", "name": "Accrued Interest", "type": "L", "natural_balance": "C", "level": 3, "parent_code": "2500", "description": "Intereses acumulados por pagar", "bank_details": None},
]

# ── 3000 CAPITAL CONTABLE ────────────────────────────────
CAPITAL_ACCOUNTS: List[AccountDef] = [
    {"code": "3100", "name": "Capital Social", "type": "E", "natural_balance": "C", "level": 1, "parent_code": "3000", "description": "Grupo: Social capital", "bank_details": None},
    {"code": "3101", "name": "Capital Social Fijo", "type": "E", "natural_balance": "C", "level": 3, "parent_code": "3100", "description": "Capital social fijo Catalyst Blockchain Labs S.A. de C.V.", "bank_details": None},
    {"code": "3102", "name": "Capital Social Variable", "type": "E", "natural_balance": "C", "level": 3, "parent_code": "3100", "description": "Capital social variable", "bank_details": None},

    {"code": "3200", "name": "Aportaciones Patrimoniales", "type": "E", "natural_balance": "C", "level": 1, "parent_code": "3000", "description": "Grupo: Capital contributions", "bank_details": None},
    {"code": "3201", "name": "CAT Token Issuance Equity", "type": "E", "natural_balance": "C", "level": 3, "parent_code": "3200", "description": "Capital vía emisión de CAT tokens", "bank_details": None},
    {"code": "3202", "name": "GNC Backing Reserve", "type": "E", "natural_balance": "C", "level": 3, "parent_code": "3200", "description": "Reserva de respaldo GNC 1:1 CNY", "bank_details": None},
    {"code": "3203", "name": "FLT Compliance Reserve", "type": "E", "natural_balance": "C", "level": 3, "parent_code": "3200", "description": "Reserva de compliance vía FLT", "bank_details": None},

    {"code": "3300", "name": "Resultados Acumulados", "type": "E", "natural_balance": "C", "level": 1, "parent_code": "3000", "description": "Grupo: Retained earnings", "bank_details": None},
    {"code": "3301", "name": "Retained Earnings Prior Periods", "type": "E", "natural_balance": "C", "level": 3, "parent_code": "3300", "description": "Resultados acumulados ejercicios anteriores", "bank_details": None},
    {"code": "3302", "name": "Net Income Current Period", "type": "E", "natural_balance": "C", "level": 3, "parent_code": "3300", "description": "Resultado neto del periodo actual", "bank_details": None},

    {"code": "3400", "name": "Resultado del Ejercicio", "type": "E", "natural_balance": "C", "level": 1, "parent_code": "3000", "description": "Grupo: Current year result", "bank_details": None},
    {"code": "3401", "name": "Net Income/Loss Current Period", "type": "E", "natural_balance": "C", "level": 3, "parent_code": "3400", "description": "Utilidad/Pérdida neta del ejercicio", "bank_details": None},
]

# ── 4000 INGRESOS ────────────────────────────────────────
INGRESOS_ACCOUNTS: List[AccountDef] = [
    {"code": "4100", "name": "Ingresos por Servicios", "type": "I", "natural_balance": "C", "level": 1, "parent_code": "4000", "description": "Grupo: Service revenue", "bank_details": None},
    {"code": "4101", "name": "QR Processing Fee Income", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4100", "description": "Ingresos por procesamiento QR UnionPay", "bank_details": None},
    {"code": "4102", "name": "SWIFT Transfer Fee Income", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4100", "description": "Ingresos por transferencia SWIFT", "bank_details": None},
    {"code": "4103", "name": "SPEI Payout Fee Income", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4100", "description": "Ingresos por payout SPEI", "bank_details": None},
    {"code": "4104", "name": "Compliance Service Fee Income", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4100", "description": "Ingresos por servicios de compliance", "bank_details": None},
    {"code": "4105", "name": "Audit Verification Fee Income", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4100", "description": "Ingresos por verificación de auditoría", "bank_details": None},
    {"code": "4106", "name": "Service Pricing Fee Income", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4100", "description": "Ingresos por pricing de servicios", "bank_details": None},

    {"code": "4200", "name": "Ingresos Financieros", "type": "I", "natural_balance": "C", "level": 1, "parent_code": "4000", "description": "Grupo: Financial income", "bank_details": None},
    {"code": "4201", "name": "Interest Income", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4200", "description": "Ingresos por intereses", "bank_details": None},
    {"code": "4202", "name": "Exchange Rate Gain", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4200", "description": "Ganancia cambiaria CNY/MXN/USD", "bank_details": None},
    {"code": "4203", "name": "CAT Appreciation Gain", "type": "I", "natural_balance": "C", "level": 3, "parent_code": "4200", "description": "Ganancia por apreciación de CAT", "bank_details": None},
]

# ── 5000 GASTOS ──────────────────────────────────────────
GASTOS_ACCOUNTS: List[AccountDef] = [
    {"code": "5100", "name": "Costos Operativos", "type": "X", "natural_balance": "D", "level": 1, "parent_code": "5000", "description": "Grupo: Operating costs", "bank_details": None},
    {"code": "5101", "name": "CAT Token Burn Cost (5% deflacionario)", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5100", "description": "Costo por quema de CAT (mecanismo deflacionario 5%)", "bank_details": None},
    {"code": "5102", "name": "UnionPay Processing Fee", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5100", "description": "Comisión de procesamiento UnionPay", "bank_details": None},
    {"code": "5103", "name": "SWIFT Network Fee", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5100", "description": "Comisión red SWIFT", "bank_details": None},
    {"code": "5104", "name": "Bitso Exchange Fee", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5100", "description": "Comisión exchange Bitso (1-3%)", "bank_details": None},

    {"code": "5200", "name": "Gastos Administrativos", "type": "X", "natural_balance": "D", "level": 1, "parent_code": "5000", "description": "Grupo: Administrative expenses", "bank_details": None},
    {"code": "5201", "name": "Salaries and Wages", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5200", "description": "Sueldos y salarios", "bank_details": None},
    {"code": "5202", "name": "Legal and Professional Fees", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5200", "description": "Honorarios legales y profesionales", "bank_details": None},
    {"code": "5203", "name": "Software and Technology", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5200", "description": "Software y tecnología", "bank_details": None},

    {"code": "5300", "name": "Gastos Financieros", "type": "X", "natural_balance": "D", "level": 1, "parent_code": "5000", "description": "Grupo: Financial expenses", "bank_details": None},
    {"code": "5301", "name": "Exchange Rate Loss", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5300", "description": "Pérdida cambiaria", "bank_details": None},
    {"code": "5302", "name": "Bank Service Charge", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5300", "description": "Comisión bancaria", "bank_details": None},
    {"code": "5303", "name": "Interest Expense", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5300", "description": "Intereses pagados", "bank_details": None},

    {"code": "5400", "name": "Gastos Fiscales", "type": "X", "natural_balance": "D", "level": 1, "parent_code": "5000", "description": "Grupo: Tax expenses", "bank_details": None},
    {"code": "5401", "name": "IVA Expense", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5400", "description": "IVA no acreditable", "bank_details": None},
    {"code": "5402", "name": "ISR Expense", "type": "X", "natural_balance": "D", "level": 3, "parent_code": "5400", "description": "ISR del ejercicio", "bank_details": None},
]

# ── 7000 CUENTAS DE ORDEN ────────────────────────────────
MEMORANDUM_ACCOUNTS: List[AccountDef] = [
    {"code": "7100", "name": "Emisión de Tokens", "type": "M", "natural_balance": "D", "level": 1, "parent_code": "7000", "description": "Grupo: Token issuance memorandum", "bank_details": None},
    {"code": "7101", "name": "CAT Total Supply", "type": "M", "natural_balance": "D", "level": 3, "parent_code": "7100", "description": "Suministro total de CAT emitido", "bank_details": None},
    {"code": "7102", "name": "CAT Total Supply Contra", "type": "M", "natural_balance": "C", "level": 3, "parent_code": "7100", "description": "Contracuenta de suministro CAT", "bank_details": None},
    {"code": "7103", "name": "CAT Total Burned", "type": "M", "natural_balance": "D", "level": 3, "parent_code": "7100", "description": "Total de CAT quemados (deflacionario)", "bank_details": None},
    {"code": "7104", "name": "GNC Total Minted", "type": "M", "natural_balance": "D", "level": 3, "parent_code": "7100", "description": "Total de GNC acuñados", "bank_details": None},
    {"code": "7105", "name": "GNC Total Minted Contra", "type": "M", "natural_balance": "C", "level": 3, "parent_code": "7100", "description": "Contracuenta de GNC acuñados", "bank_details": None},
]

# ── TOP-LEVEL GROUPS ─────────────────────────────────────
TOP_GROUPS: List[AccountDef] = [
    {"code": "1000", "name": "ACTIVO", "type": "A", "natural_balance": "D", "level": 0, "parent_code": None, "description": "Assets - Recursos controlados por la entidad", "bank_details": None},
    {"code": "2000", "name": "PASIVO", "type": "L", "natural_balance": "C", "level": 0, "parent_code": None, "description": "Liabilities - Obligaciones presentes de la entidad", "bank_details": None},
    {"code": "3000", "name": "CAPITAL CONTABLE", "type": "E", "natural_balance": "C", "level": 0, "parent_code": None, "description": "Equity - Activos netos de la entidad (NIF C-11)", "bank_details": None},
    {"code": "4000", "name": "INGRESOS", "type": "I", "natural_balance": "C", "level": 0, "parent_code": None, "description": "Revenue - Incrementos en beneficios económicos (NIF C-3)", "bank_details": None},
    {"code": "5000", "name": "GASTOS", "type": "X", "natural_balance": "D", "level": 0, "parent_code": None, "description": "Expenses - Decrementos en beneficios económicos (NIF C-3)", "bank_details": None},
    {"code": "7000", "name": "CUENTAS DE ORDEN", "type": "M", "natural_balance": "D", "level": 0, "parent_code": None, "description": "Memorandum - Cuentas de registro y control", "bank_details": None},
]

# All accounts combined
ALL_ACCOUNTS: List[AccountDef] = (
    TOP_GROUPS
    + ACTIVO_ACCOUNTS
    + PASIVO_ACCOUNTS
    + CAPITAL_ACCOUNTS
    + INGRESOS_ACCOUNTS
    + GASTOS_ACCOUNTS
    + MEMORANDUM_ACCOUNTS
)

# Account type to natural balance mapping
TYPE_BALANCE: Dict[str, str] = {
    "A": "D",  # Assets increase with debit
    "L": "C",  # Liabilities increase with credit
    "E": "C",  # Equity increases with credit
    "I": "C",  # Income increases with credit
    "X": "D",  # Expenses increase with debit
    "M": "D",  # Memorandum (varies, simplified to debit)
}

# Core bank accounts (CLABE-linked)
BANK_CLABE_ACCOUNTS = ["1102", "1103", "1104"]

# Revenue accounts (for closing entries)
REVENUE_ACCOUNTS = ["4101", "4102", "4103", "4104", "4105", "4106", "4201", "4202", "4203"]

# Expense accounts (for closing entries)
EXPENSE_ACCOUNTS = ["5101", "5102", "5103", "5104", "5201", "5202", "5203", "5301", "5302", "5303", "5401", "5402"]

# Digital asset accounts
DIGITAL_ASSET_ACCOUNTS = ["1201", "1202", "1203", "1204", "1205", "1206"]
