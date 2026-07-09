"""Catalyst Bank — Financial Statements (Estados Financieros NIF).

- Trial Balance (Balanza de Comprobación)
- Balance Sheet / Statement of Financial Position (NIF C-1)
- Income Statement (Estado de Resultados NIF C-3)
"""

from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from .ledger import LedgerService
from .constants import (
    BANK_CLABE_ACCOUNTS,
    DIGITAL_ASSET_ACCOUNTS,
    EXPENSE_ACCOUNTS,
    REVENUE_ACCOUNTS,
)


class BalanceService:
    """Generate NIF-compliant financial reports from the general ledger."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.ledger = LedgerService(session)

    # ── Trial Balance ──────────────────────────────────

    async def trial_balance(self, as_of_date: date) -> dict:
        """Generate Trial Balance (Balanza de Comprobación).

        Lists all accounts with debit/credit movements and balances.
        Total debits must equal total credits.
        """
        all_balances = await self.ledger.get_all_balances(as_of_date)

        accounts = []
        total_debit = 0.0
        total_credit = 0.0
        total_debit_balance = 0.0
        total_credit_balance = 0.0

        for bal in all_balances:
            nat = bal["natural_balance"]
            # Determine if the closing balance is a debit or credit balance
            if nat == "D":
                debit_balance = bal["closing_balance"] if bal["closing_balance"] > 0 else 0.0
                credit_balance = -bal["closing_balance"] if bal["closing_balance"] < 0 else 0.0
            else:
                credit_balance = bal["closing_balance"] if bal["closing_balance"] > 0 else 0.0
                debit_balance = -bal["closing_balance"] if bal["closing_balance"] < 0 else 0.0

            accounts.append({
                "code": bal["code"],
                "name": bal["name"],
                "type": bal["type"],
                "movement_debit": round(bal["total_debit"], 2),
                "movement_credit": round(bal["total_credit"], 2),
                "debit_balance": round(debit_balance, 2),
                "credit_balance": round(credit_balance, 2),
            })

            total_debit += bal["total_debit"]
            total_credit += bal["total_credit"]
            total_debit_balance += debit_balance
            total_credit_balance += credit_balance

        diff = abs(total_debit - total_credit)
        is_balanced = diff < 0.01

        return {
            "date": str(as_of_date),
            "accounts": accounts,
            "totals": {
                "movement_debit": round(total_debit, 2),
                "movement_credit": round(total_credit, 2),
                "debit_balance": round(total_debit_balance, 2),
                "credit_balance": round(total_credit_balance, 2),
                "difference": round(diff, 4),
            },
            "is_balanced": is_balanced,
            "report_type": "TRIAL_BALANCE",
        }

    # ── Balance Sheet (NIF C-1) ────────────────────────

    async def balance_sheet(self, as_of_date: date) -> dict:
        """Estado de Situación Financiera (NIF C-1).

        Activo = Pasivo + Capital Contable
        """
        all_balances = await self.ledger.get_all_balances(as_of_date)
        by_code: Dict[str, dict] = {b["code"]: b for b in all_balances}

        def bal(code: str) -> float:
            b = by_code.get(code, {})
            # Assets/Debit-natural: positive = debit, negative = credit
            return round(b.get("closing_balance", 0.0), 2)

        # ── ACTIVO ──
        activo_circulante = {
            "1101_caja": bal("1101"),
            "1102_bbva_principal": bal("1102"),
            "1103_bbva_secundaria": bal("1103"),
            "1104_bitso_custody": bal("1104"),
            "1105_cny_reserve": bal("1105"),
        }
        total_circulante = sum(activo_circulante.values())

        activo_digital = {
            "1201_cat": bal("1201"),
            "1202_gnc": bal("1202"),
            "1203_flt": bal("1203"),
            "1204_ctv": bal("1204"),
            "1205_frt": bal("1205"),
            "1206_aim": bal("1206"),
        }
        total_digital = sum(activo_digital.values())

        activo_receivable = {
            "1301_unionpay_recv": bal("1301"),
            "1302_swift_recv": bal("1302"),
            "1303_bitso_recv": bal("1303"),
            "1304_fees_recv": bal("1304"),
        }
        total_receivable = sum(activo_receivable.values())

        total_activo = total_circulante + total_digital + total_receivable

        # ── PASIVO ──
        pasivo_deposits = {
            "2101_mxn_deposits": bal("2101"),
            "2102_cny_deposits": bal("2102"),
        }
        total_deposits = sum(pasivo_deposits.values())

        pasivo_settlement = {
            "2201_swift_settle": bal("2201"),
            "2202_spei_settle": bal("2202"),
            "2203_gnc_redemption": bal("2203"),
        }
        total_settlement = sum(pasivo_settlement.values())

        pasivo_payables = {
            "2301_unionpay_pay": bal("2301"),
            "2302_swift_pay": bal("2302"),
            "2303_providers_pay": bal("2303"),
        }
        total_payables = sum(pasivo_payables.values())

        pasivo_fiscal = {
            "2401_iva": bal("2401"),
            "2402_isr": bal("2402"),
        }
        total_fiscal = sum(pasivo_fiscal.values())

        pasivo_accrued = {
            "2501_accrued_exp": bal("2501"),
            "2502_accrued_int": bal("2502"),
        }
        total_accrued = sum(pasivo_accrued.values())

        total_pasivo = total_deposits + total_settlement + total_payables + total_fiscal + total_accrued

        # ── CAPITAL ──
        capital_social = {
            "3101_capital_fijo": bal("3101"),
            "3102_capital_variable": bal("3102"),
        }
        total_capital_social = sum(capital_social.values())

        aportaciones = {
            "3201_cat_equity": bal("3201"),
            "3202_gnc_reserve": bal("3202"),
            "3203_flt_reserve": bal("3203"),
        }
        total_aportaciones = sum(aportaciones.values())

        resultados = {
            "3301_retained": bal("3301"),
            "3302_current_period": bal("3302"),
        }
        total_resultados = sum(resultados.values())

        resultado_ejercicio = bal("3401")
        total_capital = total_capital_social + total_aportaciones + total_resultados + resultado_ejercicio

        total_pasivo_capital = total_pasivo + total_capital

        return {
            "date": str(as_of_date),
            "activo": {
                "circulante": {"accounts": activo_circulante, "total": round(total_circulante, 2)},
                "digital": {"accounts": activo_digital, "total": round(total_digital, 2)},
                "receivable": {"accounts": activo_receivable, "total": round(total_receivable, 2)},
                "total_activo": round(total_activo, 2),
            },
            "pasivo": {
                "depositos": {"accounts": pasivo_deposits, "total": round(total_deposits, 2)},
                "settlement": {"accounts": pasivo_settlement, "total": round(total_settlement, 2)},
                "payables": {"accounts": pasivo_payables, "total": round(total_payables, 2)},
                "fiscal": {"accounts": pasivo_fiscal, "total": round(total_fiscal, 2)},
                "accrued": {"accounts": pasivo_accrued, "total": round(total_accrued, 2)},
                "total_pasivo": round(total_pasivo, 2),
            },
            "capital_contable": {
                "capital_social": {"accounts": capital_social, "total": round(total_capital_social, 2)},
                "aportaciones": {"accounts": aportaciones, "total": round(total_aportaciones, 2)},
                "resultados": {"accounts": resultados, "total": round(total_resultados, 2)},
                "resultado_ejercicio": round(resultado_ejercicio, 2),
                "total_capital": round(total_capital, 2),
            },
            "total_pasivo_y_capital": round(total_pasivo_capital, 2),
            "ecuacion_contable": {
                "activo": round(total_activo, 2),
                "pasivo_mas_capital": round(total_pasivo_capital, 2),
                "diferencia": round(total_activo - total_pasivo_capital, 4),
                "balancea": abs(total_activo - total_pasivo_capital) < 0.01,
            },
            "report_type": "BALANCE_SHEET_NIF_C1",
        }

    # ── Income Statement (NIF C-3) ──────────────────────

    async def income_statement(self, date_from: date, date_to: date) -> dict:
        """Estado de Resultados (NIF C-3).

        Ingresos - Gastos = Utilidad/Pérdida Neta
        """
        # Get trial balance for the period
        tb = await self.trial_balance(date_to)
        by_code: Dict[str, dict] = {a["code"]: a for a in tb["accounts"]}

        def movement_sum(codes: List[str], field: str = "movement_credit") -> float:
            """Sum movements for a list of account codes."""
            return round(sum(by_code.get(c, {}).get(field, 0.0) for c in codes), 2)

        # Revenue
        ingresos_servicios = {f"{c}": movement_sum([c], "movement_credit") for c in REVENUE_ACCOUNTS}
        total_ingresos_servicios = sum(ingresos_servicios.values())
        total_ingresos = total_ingresos_servicios

        # Expenses
        gastos_operativos = {f"{c}": movement_sum([c], "movement_debit") for c in EXPENSE_ACCOUNTS}
        total_gastos_operativos = sum(gastos_operativos.values())
        total_gastos = total_gastos_operativos

        # Net
        utilidad_neta = round(total_ingresos - total_gastos, 2)

        return {
            "period": {"from": str(date_from), "to": str(date_to)},
            "ingresos": {
                "servicios": ingresos_servicios,
                "total_ingresos": total_ingresos,
            },
            "gastos": {
                "operativos": gastos_operativos,
                "total_gastos": total_gastos,
            },
            "utilidad_neta": utilidad_neta,
            "report_type": "INCOME_STATEMENT_NIF_C3",
        }

    # ── Summary for daily close ────────────────────────

    async def daily_close_summary(self, as_of_date: date) -> dict:
        """Generate a compact daily close summary for P13."""
        bs = await self.balance_sheet(as_of_date)
        pl = await self.income_statement(as_of_date, as_of_date)
        tb = await self.trial_balance(as_of_date)

        return {
            "date": str(as_of_date),
            "total_assets": bs["activo"]["total_activo"],
            "total_liabilities": bs["pasivo"]["total_pasivo"],
            "total_equity": bs["capital_contable"]["total_capital"],
            "total_income": pl["ingresos"]["total_ingresos"],
            "total_expenses": pl["gastos"]["total_gastos"],
            "net_income": pl["utilidad_neta"],
            "trial_balanced": tb["is_balanced"],
            "balance_sheet_balanced": bs["ecuacion_contable"]["balancea"],
            "active_accounts": len([a for a in tb["accounts"] if a["movement_debit"] > 0 or a["movement_credit"] > 0]),
        }
