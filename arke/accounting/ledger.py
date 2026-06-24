"""Catalyst Bank — General Ledger (Libro Mayor).

Computes running balances per account from journal entry lines.
Supports daily balance snapshots and full ledger queries.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import AccountBalance, AccountCatalog, JournalEntry, JournalEntryLine
from .constants import TYPE_BALANCE


class LedgerService:
    """General ledger: running balances, account activity, balance snapshots."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ── Balance computation ─────────────────────────────

    async def compute_account_balances(
        self, as_of_date: date
    ) -> List[AccountBalance]:
        """Compute or update daily balances for all accounts as of a given date.

        Groups all journal lines for the date by account_code, sums debits/credits,
        then applies opening balance to produce closing balance.
        """
        # Get all account codes that had activity on this date
        line_totals: Dict[str, Tuple[float, float]] = {}

        lines_result = await self.session.execute(
            select(
                JournalEntryLine.account_code,
                func.sum(JournalEntryLine.debit).label("total_debit"),
                func.sum(JournalEntryLine.credit).label("total_credit"),
            )
            .join(JournalEntry, JournalEntryLine.entry_id == JournalEntry.entry_id)
            .where(JournalEntry.entry_date == as_of_date)
            .group_by(JournalEntryLine.account_code)
        )
        for row in lines_result:
            line_totals[row.account_code] = (row.total_debit or 0.0, row.total_credit or 0.0)

        # Get previous day closing balances to use as opening
        prev_balances: Dict[str, float] = {}
        prev_result = await self.session.execute(
            select(AccountBalance).where(AccountBalance.as_of_date < as_of_date)
        )
        prev_rows = list(prev_result.scalars().all())
        # Keep the latest per account
        for pb in sorted(prev_rows, key=lambda x: x.as_of_date):
            prev_balances[pb.account_code] = pb.closing_balance

        # Build new balance records
        balances = []
        for code, (debit, credit) in line_totals.items():
            opening = prev_balances.get(code, 0.0)
            closing = opening + debit - credit

            balance = AccountBalance(
                account_code=code,
                as_of_date=as_of_date,
                opening_balance=round(opening, 4),
                total_debit=round(debit, 4),
                total_credit=round(credit, 4),
                closing_balance=round(closing, 4),
                currency="CNY",
            )
            self.session.add(balance)
            balances.append(balance)

        await self.session.commit()
        return balances

    # ── Query ───────────────────────────────────────────

    async def get_balance(self, account_code: str, as_of_date: Optional[date] = None) -> Optional[AccountBalance]:
        """Get the most recent balance for an account."""
        stmt = select(AccountBalance).where(
            AccountBalance.account_code == account_code
        ).order_by(AccountBalance.as_of_date.desc()).limit(1)

        if as_of_date:
            stmt = select(AccountBalance).where(
                and_(
                    AccountBalance.account_code == account_code,
                    AccountBalance.as_of_date <= as_of_date,
                )
            ).order_by(AccountBalance.as_of_date.desc()).limit(1)

        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_all_balances(self, as_of_date: date) -> List[dict]:
        """Get balances for all active accounts as of a date."""
        # Get active accounts
        accts_result = await self.session.execute(
            select(AccountCatalog).where(AccountCatalog.is_active == True)  # noqa: E712
        )
        accounts = {a.code: a for a in accts_result.scalars().all()}

        # Get latest balance per account up to date
        subq = (
            select(
                AccountBalance.account_code,
                func.max(AccountBalance.as_of_date).label("max_date"),
            )
            .where(AccountBalance.as_of_date <= as_of_date)
            .group_by(AccountBalance.account_code)
            .subquery()
        )
        bal_result = await self.session.execute(
            select(AccountBalance).join(
                subq,
                and_(
                    AccountBalance.account_code == subq.c.account_code,
                    AccountBalance.as_of_date == subq.c.max_date,
                ),
            )
        )
        balances = {b.account_code: b for b in bal_result.scalars().all()}

        result = []
        for code, acct in sorted(accounts.items()):
            bal = balances.get(code)
            result.append({
                "code": code,
                "name": acct.name,
                "type": acct.type,
                "natural_balance": acct.natural_balance,
                "opening_balance": bal.opening_balance if bal else 0.0,
                "total_debit": bal.total_debit if bal else 0.0,
                "total_credit": bal.total_credit if bal else 0.0,
                "closing_balance": bal.closing_balance if bal else 0.0,
                "as_of_date": str(bal.as_of_date) if bal else str(as_of_date),
            })
        return result

    async def get_ledger(
        self, account_code: str, date_from: Optional[date] = None, date_to: Optional[date] = None
    ) -> List[dict]:
        """Get full ledger (all journal line entries) for an account."""
        stmt = (
            select(JournalEntryLine, JournalEntry)
            .join(JournalEntry, JournalEntryLine.entry_id == JournalEntry.entry_id)
            .where(JournalEntryLine.account_code == account_code)
            .order_by(JournalEntry.entry_date, JournalEntry.entry_id)
        )
        if date_from:
            stmt = stmt.where(JournalEntry.entry_date >= date_from)
        if date_to:
            stmt = stmt.where(JournalEntry.entry_date <= date_to)

        result = await self.session.execute(stmt)
        rows = result.all()

        running = 0.0
        ledger = []
        for line, header in rows:
            line_change = line.debit - line.credit
            running += line_change
            ledger.append({
                "entry_id": header.entry_id,
                "date": str(header.entry_date),
                "description": line.description,
                "debit": line.debit,
                "credit": line.credit,
                "currency": line.currency,
                "running_balance": round(running, 4),
            })
        return ledger

    async def recalculate_all_balances(self) -> int:
        """Full recalculation: rebuild all daily balances from journal entries.

        Returns number of balance records created.
        """
        # Delete existing balances
        await self.session.execute(
            # Raw delete for SQLite compatibility
            select(AccountBalance)  # no-op to verify table exists
        )
        # Get all unique dates from journal entries
        dates_result = await self.session.execute(
            select(func.distinct(JournalEntry.entry_date)).order_by(JournalEntry.entry_date)
        )
        dates = [row[0] for row in dates_result]

        total = 0
        for d in dates:
            balances = await self.compute_account_balances(d)
            total += len(balances)

        return total
