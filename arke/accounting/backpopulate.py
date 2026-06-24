"""Catalyst Bank — Back-Population Service.

Reads existing daily reports, QR trigger reports, treasury data, and transaction logs,
then creates full double-entry journal entries for all activity since June 17, 2026.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import DailyClosure, ReconciliationLog
from .catalog import CatalogService
from .journal import JournalService
from .ledger import LedgerService
from .balance import BalanceService


class BackpopulateService:
    """Retro-puebla toda la contabilidad desde el 17 de junio 2026."""

    def __init__(self, session: AsyncSession, project_root: Optional[Path] = None):
        self.session = session
        self.root = project_root or Path(__file__).resolve().parent.parent.parent
        self.catalog = CatalogService(session)
        self.journal = JournalService(session)
        self.ledger = LedgerService(session)
        self.balance = BalanceService(session)

    # ── Main entry point ───────────────────────────────

    async def run(self) -> dict:
        """Execute full back-population. Returns summary dict."""
        summary = {
            "catalog_initialized": 0,
            "entries_created": [],
            "closure_dates": [],
            "reconciliations": [],
            "errors": [],
        }

        # Phase A: Initialize catalog
        count = await self.catalog.initialize_catalog()
        summary["catalog_initialized"] = count
        print(f"  [Fase A] Catalogo: {count} cuentas inicializadas")

        # Phase B: Load data files
        reports = self._load_daily_reports()
        treasury = self._load_json("Eincode/arke/treasury_wallet_100m.json")
        transactions = self._load_json("apps/catalyst-studio/server/transactions.json")
        qr_triggers = self._load_json("Eincode/arke/qr_triggers_report_2026-06-22.json")

        # Phase C: Opening balance entry
        try:
            entry = await self._create_opening_entry(treasury)
            if entry:
                summary["entries_created"].append(entry.entry_id)
                print(f"  [Fase C] Apertura: {entry.entry_id}")
        except Exception as e:
            summary["errors"].append(f"Opening: {e}")
            print(f"  [ERROR] Apertura: {e}")

        # Phase D: Daily operations for each report date
        for report in reports:
            try:
                entry = await self._create_daily_entry(report)
                if entry:
                    summary["entries_created"].append(entry.entry_id)
                    print(f"  [Fase D] Diario {report['date']}: {entry.entry_id}")
            except Exception as e:
                summary["errors"].append(f"Daily {report.get('date', '?')}: {e}")
                print(f"  [ERROR] Diario {report.get('date', '?')}: {e}")

        # Phase E: QR trigger individual entries
        if qr_triggers:
            for trigger in qr_triggers.get("results", []):
                try:
                    entry = await self._create_qr_entry(trigger)
                    if entry:
                        summary["entries_created"].append(entry.entry_id)
                except Exception as e:
                    summary["errors"].append(f"QR {trigger.get('id', '?')}: {e}")

            print(f"  [Fase E] QR Triggers: {len(qr_triggers.get('results', []))} entradas")

        # Phase F: COBRAR transaction
        if isinstance(transactions, list):
            for tx in transactions:
                try:
                    entry = await self._create_cobrar_entry(tx)
                    if entry:
                        summary["entries_created"].append(entry.entry_id)
                        print(f"  [Fase F] COBRAR: {entry.entry_id}")
                except Exception as e:
                    summary["errors"].append(f"COBRAR {tx.get('id', '?')}: {e}")

        # Phase G: Daily closing entries for each date with activity
        all_dates = set()
        for report in reports:
            all_dates.add(date.fromisoformat(report["date"]))
        all_dates.add(date(2026, 6, 22))  # QR + COBRAR day

        # Compute account balances for each date before closing
        for d in sorted(all_dates):
            await self.ledger.compute_account_balances(d)
            print(f"  [Ledger] Balances {d}: computados")

        for d in sorted(all_dates):
            try:
                closure = await self._create_closing_entry(d)
                if closure:
                    summary["closure_dates"].append(str(d))
                    print(f"  [Fase G] Cierre {d}: {closure.closure_hash[:16]}...")
            except Exception as e:
                summary["errors"].append(f"Closure {d}: {e}")

        # Phase H: Reconciliations
        for d in sorted(all_dates):
            try:
                rec = await self._create_reconciliation(d)
                if rec:
                    summary["reconciliations"].append(str(d))
            except Exception as e:
                summary["errors"].append(f"Reconciliation {d}: {e}")

        print(f"  [Fase H] Conciliaciones: {len(summary['reconciliations'])} dias")

        return summary

    # ── Data loaders ───────────────────────────────────

    def _load_json(self, relative_path: str) -> dict | list:
        path = self.root / relative_path
        if not path.exists():
            print(f"  [WARN] No encontrado: {path}")
            return {} if "wallet" in relative_path or "triggers" in relative_path else []
        return json.loads(path.read_text(encoding="utf-8"))

    def _load_daily_reports(self) -> List[dict]:
        """Load all daily reports from Eincode/arke/."""
        reports_dir = self.root / "Eincode" / "arke"
        reports = []
        if reports_dir.exists():
            for f in sorted(reports_dir.glob("daily_report_*.json")):
                data = json.loads(f.read_text(encoding="utf-8"))
                if "date" in data:
                    reports.append(data)
        return reports

    # ── Entry creators ─────────────────────────────────

    async def _create_opening_entry(self, treasury: dict) -> Optional[any]:
        """JE-YYYYMMDD-OPENING: Saldo inicial de contabilidad bancaria."""
        if not treasury:
            return None

        balances = treasury.get("balances", {})
        cat_raw = balances.get("CAT", "0").replace(",", "").split("(")[0].strip()
        gnc_raw = balances.get("GNC", "0").replace(",", "").split("(")[0].strip()
        flt_raw = balances.get("FLT", "0").replace(",", "").split("(")[0].strip()
        ctv_raw = balances.get("CTV", "0").split("(")[0].strip()

        cat_amount = float(cat_raw)  # 99,830,000
        gnc_amount = float(gnc_raw)  # 4,390,000
        flt_amount = float(flt_raw)  # 250,000,000
        ctv_amount = float(ctv_raw)  # 10

        # Value everything in CAT-equivalent for the equity side
        # CAT=$0.10 USD, GNC=1:1 CNY (¥0.686 CNY/CAT... actually CAT/CNY=0.725)
        # Simplified: use raw numbers, equity offsets
        total_equity_value = cat_amount + gnc_amount + ctv_amount  # + flt as separate

        open_date = date(2026, 6, 17)

        lines = [
            # Digital assets (DEBIT)
            {"account_code": "1201", "description": "CAT Token en treasury 0x7bb22e84...", "debit": cat_amount, "currency": "CAT", "asset_type": "CAT"},
            {"account_code": "1202", "description": "GNC Token en treasury (1:1 CNY)", "debit": gnc_amount, "currency": "CNY", "asset_type": "GNC"},
            {"account_code": "1203", "description": "FLT Token en treasury", "debit": flt_amount, "currency": "FLT", "asset_type": "FLT"},
            {"account_code": "1204", "description": "CTV Token en treasury (Libre Usanza)", "debit": ctv_amount, "currency": "CTV", "asset_type": "CTV"},

            # Equity (CREDIT)
            {"account_code": "3101", "description": "Capital Social Fijo - Catalyst Blockchain Labs S.A. de C.V.", "credit": cat_amount, "currency": "CAT"},
            {"account_code": "3202", "description": "GNC Backing Reserve (1:1 CNY)", "credit": gnc_amount, "currency": "CNY"},
            {"account_code": "3203", "description": "FLT Compliance Reserve", "credit": flt_amount, "currency": "FLT"},
            {"account_code": "3201", "description": "CAT Token Issuance Equity (CTV)", "credit": ctv_amount, "currency": "CTV"},
        ]

        return await self.journal.create_entry(
            entry_date=open_date,
            description="Apertura de contabilidad bancaria Catalyst — Saldos iniciales treasury",
            lines=lines,
            source="OPENING",
            is_opening=True,
        )

    async def _create_daily_entry(self, report: dict) -> Optional[any]:
        """JE-YYYYMMDD-DAILY: Operaciones diarias."""
        d = date.fromisoformat(report["date"])
        cny = report.get("total_processed_cny", 0.0)
        fees = report.get("total_fees_cny", 0.0)
        burned = report.get("total_burned_cat", 0.0)
        ops = report.get("total_operations", 0)

        if cny == 0 and burned == 0:
            return None

        net_cny = cny - fees  # CNY to GNC liability after fees

        lines = [
            # Receivable from UnionPay QR processing (DEBIT)
            {"account_code": "1301", "description": f"QR Receivable - {ops} operaciones", "debit": cny, "currency": "CNY", "asset_type": "CNY"},
            # GNC redemption liability (CREDIT) net of fees
            {"account_code": "2203", "description": f"GNC Liability - {ops} emisiones", "credit": net_cny, "currency": "CNY"},
            # Fee income (CREDIT)
            {"account_code": "4101", "description": f"QR Processing Fees - {ops} operaciones", "credit": fees, "currency": "CNY"},
        ]

        if burned > 0:
            lines.extend([
                # CAT burn cost (DEBIT)
                {"account_code": "5101", "description": f"CAT Burn Cost - {ops} operaciones (5% deflacionario)", "debit": burned, "currency": "CAT", "asset_type": "CAT"},
                # CAT treasury reduction (CREDIT)
                {"account_code": "1201", "description": f"CAT Treasury - quema de {burned} tokens", "credit": burned, "currency": "CAT", "asset_type": "CAT"},
            ])

        return await self.journal.create_entry(
            entry_date=d,
            description=f"Operaciones diarias {report['date']} — {ops} ops, ¥{cny:,.2f} CNY, {burned:,.0f} CAT burned",
            lines=lines,
            source="DAILY",
            reference_type="DAILY_REPORT",
            reference_id=report.get("seal", ""),
        )

    async def _create_qr_entry(self, trigger: dict) -> Optional[any]:
        """JE-YYYYMMDD-QR-XX: Individual QR trigger settlement."""
        d = date(2026, 6, 22)
        qr_id = trigger.get("id", "QR-??")
        cny = trigger.get("cny", 0.0)
        burned = trigger.get("catBurned", 0.0)
        bits = trigger.get("bits", 0)
        proof = trigger.get("proof", "")

        # Fee is approximately 0.15% of CNY
        fee = round(cny * 0.0015, 2)
        net_cny = cny - fee

        lines = [
            {"account_code": "1301", "description": f"{qr_id} — {bits}-bit QR settlement", "debit": cny, "currency": "CNY", "asset_type": "CNY"},
            {"account_code": "2203", "description": f"{qr_id} — GNC backing emitido", "credit": net_cny, "currency": "CNY"},
            {"account_code": "4101", "description": f"{qr_id} — Processing fee", "credit": fee, "currency": "CNY"},
        ]

        if burned > 0:
            lines.extend([
                {"account_code": "5101", "description": f"{qr_id} — CAT burn (5%)", "debit": burned, "currency": "CAT", "asset_type": "CAT"},
                {"account_code": "1201", "description": f"{qr_id} — CAT treasury reduction", "credit": burned, "currency": "CAT", "asset_type": "CAT"},
            ])

        return await self.journal.create_entry(
            entry_date=d,
            description=f"QR Trigger {qr_id} — {bits}-bit apertura QR, ¥{cny:,.0f} CNY, {burned:,.0f} CAT burned",
            lines=lines,
            source="QR_TRIGGER",
            reference_type="QR_SETTLEMENT",
            reference_id=proof[:32] if proof else "",
        )

    async def _create_cobrar_entry(self, tx: dict) -> Optional[any]:
        """JE-YYYYMMDD-COBRAR-NNN: CAT burn for SPEI payout."""
        ts = tx.get("timestamp", "2026-06-22")
        d = date.fromisoformat(ts[:10])
        cat_amount = tx.get("amount_cat", 0)
        cat_burned = tx.get("cat_burned", 0)
        mxn_amount = tx.get("mxn_amount", 0)
        recipient = tx.get("recipient_name", "Cliente")
        clabe = tx.get("clabe", "012290015202390246")

        # SPEI fee is approximately 1% of MXN amount
        fee_mxn = round(mxn_amount * 0.01, 2)
        net_mxn = mxn_amount - fee_mxn

        lines = [
            # CAT burn cost (DEBIT)
            {"account_code": "5101", "description": f"COBRAR burn {cat_amount} CAT", "debit": cat_burned, "currency": "CAT", "asset_type": "CAT"},
            # CAT treasury reduction (CREDIT)
            {"account_code": "1201", "description": "CAT treasury reduction", "credit": cat_burned, "currency": "CAT", "asset_type": "CAT"},
            # SPEI receivable — gross (DEBIT)
            {"account_code": "1303", "description": f"SPEI Receivable - {recipient}", "debit": mxn_amount, "currency": "MXN", "asset_type": "MXN"},
            # SPEI pending settlement — net to recipient (CREDIT)
            {"account_code": "2202", "description": f"SPEI Pending - CLABE {clabe}", "credit": net_mxn, "currency": "MXN"},
            # SPEI fee income (CREDIT)
            {"account_code": "4103", "description": f"SPEI Payout Fee - {recipient}", "credit": fee_mxn, "currency": "MXN"},
        ]

        return await self.journal.create_entry(
            entry_date=d,
            description=f"COBRAR - {recipient} - {cat_amount} CAT -> ${mxn_amount:,.0f} MXN SPEI -> {clabe}",
            lines=lines,
            source="COBRAR",
            reference_type="SPEI_PAYOUT",
            reference_id=tx.get("bitso_payout_id", ""),
        )

    async def _create_closing_entry(self, close_date: date) -> Optional[DailyClosure]:
        """Create daily close record with all financial statement summaries."""
        summary = await self.balance.daily_close_summary(close_date)

        # Compute closure hash
        raw = f"{close_date}|{summary['total_assets']}|{summary['total_liabilities']}|{summary['total_equity']}|{summary['net_income']}"
        closure_hash = hashlib.sha256(raw.encode()).hexdigest()

        closure = DailyClosure(
            close_date=close_date,
            total_assets=round(summary["total_assets"], 2),
            total_liabilities=round(summary["total_liabilities"], 2),
            total_equity=round(summary["total_equity"], 2),
            total_income=round(summary["total_income"], 2),
            total_expenses=round(summary["total_expenses"], 2),
            net_income=round(summary["net_income"], 2),
            trial_balance_count=summary["active_accounts"],
            trial_balance_total=round(summary["total_assets"], 2),
            closure_hash=closure_hash,
            is_verified=summary["trial_balanced"] and summary["balance_sheet_balanced"],
            notes=f"Auto-generated back-population. Trial balanced: {summary['trial_balanced']}, BS balanced: {summary['balance_sheet_balanced']}",
        )
        self.session.add(closure)
        await self.session.commit()
        return closure

    async def _create_reconciliation(self, rec_date: date) -> Optional[ReconciliationLog]:
        """Create reconciliation record between on-chain data and accounting."""
        entry_count = await self.journal.count_entries_for_date(rec_date)

        # Sum journal debits for QR and DAILY sourced entries only (exclude OPENING/CLOSING)
        from sqlalchemy import select, func
        from ..models import JournalEntry as JE, JournalEntryLine as JEL

        je_total_result = await self.session.execute(
            select(func.sum(JEL.debit))
            .join(JE, JEL.entry_id == JE.entry_id)
            .where(JE.entry_date == rec_date)
            .where(JE.source.in_(["DAILY", "QR_TRIGGER", "COBRAR"]))
        )
        journal_total = je_total_result.scalar_one() or 0.0

        # Source amount: daily report total CNY processed
        reports_dir = self.root / "Eincode" / "arke"
        source_amount = 0.0
        source_count = 0
        report_file = reports_dir / f"daily_report_{rec_date.isoformat()}.json"
        if report_file.exists():
            report = json.loads(report_file.read_text(encoding="utf-8"))
            source_amount = report.get("total_processed_cny", 0.0)
            source_count = 1

        # Also count QR triggers for Jun 22
        qr_file = reports_dir / "qr_triggers_report_2026-06-22.json"
        if qr_file.exists() and rec_date == date(2026, 6, 22):
            qr_report = json.loads(qr_file.read_text(encoding="utf-8"))
            source_count += qr_report.get("triggers_executed", 0)

        variance = round(source_amount - journal_total, 4)
        is_matched = abs(variance) < 1.0  # Allow 1 CNY tolerance

        rec_data = f"{rec_date}|{source_count}|{entry_count}|{source_amount}|{journal_total}|{variance}"
        proof_hash = hashlib.sha256(rec_data.encode()).hexdigest()

        rec = ReconciliationLog(
            reconciliation_date=rec_date,
            source="DAILY_REPORT+QR_TRIGGERS",
            source_count=source_count,
            journal_entry_count=entry_count,
            total_source_amount=round(source_amount, 2),
            total_journal_amount=round(journal_total, 2),
            variance=round(variance, 4),
            is_matched=is_matched,
            proof_hash=proof_hash,
            details={"report_total_cny": source_amount, "journal_debit_total": journal_total},
        )
        self.session.add(rec)
        await self.session.commit()
        return rec
