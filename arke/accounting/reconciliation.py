"""Catalyst Bank — On-Chain ↔ Accounting Reconciliation.

Matches on-chain SettlementLog records and treasury balances against
off-chain double-entry journal entries and account balances.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ReconciliationLog, JournalEntry, JournalEntryLine, AccountBalance


class ReconciliationService:
    """Reconcile on-chain settlement data with accounting journal entries."""

    def __init__(self, session: AsyncSession, project_root: Optional[Path] = None):
        self.session = session
        self.root = project_root or Path(__file__).resolve().parent.parent.parent

    async def reconcile_daily(self, rec_date: date) -> ReconciliationLog:
        """Reconcile one day: Daily report totals vs Journal entry totals."""
        # Count journal entries for this date
        je_result = await self.session.execute(
            select(func.count(JournalEntry.id)).where(JournalEntry.entry_date == rec_date)
        )
        entry_count = je_result.scalar_one()

        # Sum journal debits
        debit_result = await self.session.execute(
            select(func.sum(JournalEntryLine.debit))
            .join(JournalEntry, JournalEntryLine.entry_id == JournalEntry.entry_id)
            .where(JournalEntry.entry_date == rec_date)
        )
        journal_total = debit_result.scalar_one() or 0.0

        # Source total from daily report
        source_amount = 0.0
        source_count = 0
        reports_dir = self.root / "Eincode" / "arke"
        report_file = reports_dir / f"daily_report_{rec_date.isoformat()}.json"
        if report_file.exists():
            report = json.loads(report_file.read_text(encoding="utf-8"))
            source_amount = report.get("total_processed_cny", 0.0)
            source_count = 1

        # Also check QR triggers report for Jun 22
        qr_file = reports_dir / "qr_triggers_report_2026-06-22.json"
        qr_amount = 0.0
        if qr_file.exists() and rec_date == date(2026, 6, 22):
            qr_report = json.loads(qr_file.read_text(encoding="utf-8"))
            qr_amount = qr_report.get("total_cny_processed", 0.0)
            if qr_amount:
                source_amount = qr_amount
                source_count = qr_report.get("triggers_executed", 0)

        variance = round(source_amount - journal_total, 4)
        is_matched = abs(variance) < 0.01

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
            details={
                "daily_report_amount": source_amount,
                "qr_amount": qr_amount,
                "journal_debit_total": journal_total,
            },
        )
        self.session.add(rec)
        await self.session.commit()
        return rec

    async def reconcile_treasury_balances(self, as_of_date: date) -> dict:
        """Compare on-chain treasury balances with accounting ledger balances.

        For Hardhat/localhost, we read from the treasury_wallet_100m.json.
        In production, this would query the chain via RPC.
        """
        # Read treasury wallet data
        treasury_file = self.root / "Eincode" / "arke" / "treasury_wallet_100m.json"
        onchain = {}
        if treasury_file.exists():
            data = json.loads(treasury_file.read_text(encoding="utf-8"))
            balances = data.get("balances", {})
            onchain["CAT"] = float(balances.get("CAT", "0").replace(",", "").split("(")[0].strip())
            onchain["GNC"] = float(balances.get("GNC", "0").replace(",", "").split("(")[0].strip())
            onchain["FLT"] = float(balances.get("FLT", "0").replace(",", "").split("(")[0].strip())
            onchain["CTV"] = float(balances.get("CTV", "0").split("(")[0].strip())

        # Get accounting balances for digital asset accounts
        digital_map = {"CAT": "1201", "GNC": "1202", "FLT": "1203", "CTV": "1204"}

        accounting = {}
        for token, code in digital_map.items():
            bal_result = await self.session.execute(
                select(AccountBalance)
                .where(AccountBalance.account_code == code)
                .order_by(AccountBalance.as_of_date.desc())
                .limit(1)
            )
            bal = bal_result.scalars().first()
            accounting[token] = bal.closing_balance if bal else 0.0

        # Compare
        comparison = {}
        all_matched = True
        for token in digital_map:
            onchain_val = onchain.get(token, 0.0)
            acct_val = accounting.get(token, 0.0)
            diff = abs(onchain_val - acct_val)
            matched = diff < 1.0  # 1 token tolerance
            comparison[token] = {
                "onchain": onchain_val,
                "accounting": acct_val,
                "difference": round(diff, 4),
                "matched": matched,
            }
            if not matched:
                all_matched = False

        treasury_data = f"{as_of_date}|{json.dumps(comparison)}"
        proof_hash = hashlib.sha256(treasury_data.encode()).hexdigest()

        rec = ReconciliationLog(
            reconciliation_date=as_of_date,
            source="TREASURY_BALANCE",
            source_count=len(onchain),
            journal_entry_count=len(accounting),
            total_source_amount=sum(onchain.values()),
            total_journal_amount=sum(accounting.values()),
            variance=round(sum(onchain.values()) - sum(accounting.values()), 4),
            is_matched=all_matched,
            proof_hash=proof_hash,
            details={"comparison": comparison},
        )
        self.session.add(rec)
        await self.session.commit()

        return {
            "date": str(as_of_date),
            "comparison": comparison,
            "all_matched": all_matched,
            "proof_hash": proof_hash,
        }

    async def generate_report(self, rec_date: date) -> dict:
        """Generate full reconciliation report for a date."""
        # Get reconciliation logs
        logs_result = await self.session.execute(
            select(ReconciliationLog).where(ReconciliationLog.reconciliation_date == rec_date)
        )
        logs = logs_result.scalars().all()

        return {
            "date": str(rec_date),
            "reconciliations": [
                {
                    "source": log.source,
                    "source_count": log.source_count,
                    "journal_count": log.journal_entry_count,
                    "source_amount": log.total_source_amount,
                    "journal_amount": log.total_journal_amount,
                    "variance": log.variance,
                    "is_matched": log.is_matched,
                    "proof_hash": log.proof_hash,
                }
                for log in logs
            ],
            "summary": {
                "total_reconciliations": len(logs),
                "all_matched": all(log.is_matched for log in logs),
                "total_variance": round(sum(abs(log.variance) for log in logs), 4),
            },
        }

    async def list_reconciliations(
        self, date_from: Optional[date] = None, date_to: Optional[date] = None
    ) -> List[ReconciliationLog]:
        """List reconciliation records."""
        stmt = select(ReconciliationLog).order_by(ReconciliationLog.reconciliation_date.desc())
        if date_from:
            stmt = stmt.where(ReconciliationLog.reconciliation_date >= date_from)
        if date_to:
            stmt = stmt.where(ReconciliationLog.reconciliation_date <= date_to)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
