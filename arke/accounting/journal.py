"""Catalyst Bank — Double-Entry Journal (Diario Contable).

Every financial event is recorded as a journal entry with balanced debits and credits.
Entry IDs follow the format: JE-YYYYMMDD-NNN
"""

from __future__ import annotations

import hashlib
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import JournalEntry, JournalEntryLine


class JournalService:
    """Double-entry journal: create, validate, query entries."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ── Create ──────────────────────────────────────────

    async def create_entry(
        self,
        entry_date: date,
        description: str,
        lines: List[dict],
        source: str = "MANUAL",
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        is_opening: bool = False,
        posted_by: str = "system",
    ) -> JournalEntry:
        """Create a balanced journal entry.

        Each line dict must have: account_code, description, debit (or credit), currency.
        Optional per line: asset_type, onchain_tx_hash, settlement_log_id.

        Raises ValueError if debits != credits.
        """
        total_debit = sum(line.get("debit", 0.0) for line in lines)
        total_credit = sum(line.get("credit", 0.0) for line in lines)

        if abs(total_debit - total_credit) > 0.001:
            raise ValueError(
                f"Unbalanced entry: debit={total_debit:.4f}, credit={total_credit:.4f}, "
                f"diff={abs(total_debit - total_credit):.4f}"
            )

        # Generate entry ID
        entry_id = await self._generate_entry_id(entry_date)

        # Compute proof hash
        proof_data = f"{entry_id}|{entry_date}|{description}|{total_debit}|{total_credit}"
        proof_hash = hashlib.sha256(proof_data.encode()).hexdigest()

        header = JournalEntry(
            entry_id=entry_id,
            entry_date=entry_date,
            description=description,
            source=source,
            reference_type=reference_type,
            reference_id=reference_id,
            total_debit=round(total_debit, 4),
            total_credit=round(total_credit, 4),
            is_opening=is_opening,
            proof_hash=proof_hash,
            posted_by=posted_by,
        )
        self.session.add(header)

        for line in lines:
            detail = JournalEntryLine(
                entry_id=entry_id,
                account_code=line["account_code"],
                description=line.get("description", description),
                debit=round(line.get("debit", 0.0), 4),
                credit=round(line.get("credit", 0.0), 4),
                currency=line.get("currency", "CNY"),
                asset_type=line.get("asset_type"),
                onchain_tx_hash=line.get("onchain_tx_hash"),
                settlement_log_id=line.get("settlement_log_id"),
            )
            self.session.add(detail)

        await self.session.commit()
        return header

    async def _generate_entry_id(self, entry_date: date) -> str:
        """Generate sequential entry ID: JE-YYYYMMDD-NNN."""
        date_str = entry_date.strftime("%Y%m%d")
        prefix = f"JE-{date_str}-"

        result = await self.session.execute(
            select(func.count(JournalEntry.id)).where(
                JournalEntry.entry_id.like(f"{prefix}%")
            )
        )
        count = result.scalar_one() + 1
        return f"{prefix}{count:03d}"

    # ── Query ───────────────────────────────────────────

    async def get_entry(self, entry_id: str) -> Optional[dict]:
        """Get full journal entry with all its lines."""
        result = await self.session.execute(
            select(JournalEntry).where(JournalEntry.entry_id == entry_id)
        )
        header = result.scalars().first()
        if not header:
            return None

        lines = await self._get_lines(entry_id)
        return {
            "entry_id": header.entry_id,
            "entry_date": str(header.entry_date),
            "description": header.description,
            "source": header.source,
            "reference_type": header.reference_type,
            "reference_id": header.reference_id,
            "total_debit": header.total_debit,
            "total_credit": header.total_credit,
            "is_opening": header.is_opening,
            "proof_hash": header.proof_hash,
            "created_at": str(header.created_at) if header.created_at else None,
            "lines": lines,
        }

    async def list_entries(
        self,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        account_code: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 100,
    ) -> List[dict]:
        """Query journal entries with optional filters."""
        stmt = select(JournalEntry)

        if date_from:
            stmt = stmt.where(JournalEntry.entry_date >= date_from)
        if date_to:
            stmt = stmt.where(JournalEntry.entry_date <= date_to)
        if source:
            stmt = stmt.where(JournalEntry.source == source)

        stmt = stmt.order_by(JournalEntry.entry_date.desc(), JournalEntry.entry_id.desc()).limit(limit)
        result = await self.session.execute(stmt)
        headers = result.scalars().all()

        entries = []
        for h in headers:
            include = True
            if account_code:
                lines = await self._get_lines(h.entry_id)
                include = any(line["account_code"] == account_code for line in lines)
            if include:
                entries.append({
                    "entry_id": h.entry_id,
                    "entry_date": str(h.entry_date),
                    "description": h.description,
                    "source": h.source,
                    "total_debit": h.total_debit,
                    "total_credit": h.total_credit,
                    "proof_hash": h.proof_hash,
                })
        return entries

    async def _get_lines(self, entry_id: str) -> List[dict]:
        """Get all lines for a journal entry."""
        result = await self.session.execute(
            select(JournalEntryLine).where(JournalEntryLine.entry_id == entry_id)
        )
        return [
            {
                "account_code": line.account_code,
                "description": line.description,
                "debit": line.debit,
                "credit": line.credit,
                "currency": line.currency,
                "asset_type": line.asset_type,
                "onchain_tx_hash": line.onchain_tx_hash,
                "settlement_log_id": line.settlement_log_id,
            }
            for line in result.scalars().all()
        ]

    async def count_entries_for_date(self, entry_date: date) -> int:
        """Count journal entries for a specific date."""
        result = await self.session.execute(
            select(func.count(JournalEntry.id)).where(JournalEntry.entry_date == entry_date)
        )
        return result.scalar_one()

    async def total_amount_for_date(self, entry_date: date, source: Optional[str] = None) -> float:
        """Sum of all debit amounts for a date (should equal credit sum)."""
        stmt = select(func.sum(JournalEntry.total_debit)).where(
            JournalEntry.entry_date == entry_date
        )
        if source:
            stmt = stmt.where(JournalEntry.source == source)
        result = await self.session.execute(stmt)
        return result.scalar_one() or 0.0
