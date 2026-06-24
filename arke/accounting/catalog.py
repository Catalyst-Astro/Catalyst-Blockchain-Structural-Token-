"""Catalyst Bank — Chart of Accounts CRUD (Catálogo de Cuentas NIF)."""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from ..models import AccountCatalog
from .constants import ALL_ACCOUNTS, TYPE_BALANCE


class CatalogService:
    """Manage the NIF-aligned chart of accounts (58 cuentas)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    # ── Initialization ──────────────────────────────────

    async def initialize_catalog(self) -> int:
        """Insert the full 58-account catalog if empty. Returns count inserted."""
        existing = (await self.session.execute(select(AccountCatalog))).scalars().first()
        if existing:
            return 0  # already initialized

        count = 0
        for acct_def in ALL_ACCOUNTS:
            account = AccountCatalog(
                code=acct_def["code"],
                name=acct_def["name"],
                type=acct_def["type"],
                natural_balance=acct_def["natural_balance"],
                level=acct_def["level"],
                parent_code=acct_def["parent_code"],
                description=acct_def["description"],
                bank_details=acct_def.get("bank_details"),
            )
            self.session.add(account)
            count += 1

        await self.session.commit()
        return count

    # ── Query ───────────────────────────────────────────

    async def get_account(self, code: str) -> Optional[AccountCatalog]:
        """Get a single account by its 4-digit code."""
        result = await self.session.execute(
            select(AccountCatalog).where(AccountCatalog.code == code)
        )
        return result.scalars().first()

    async def list_accounts(
        self,
        account_type: Optional[str] = None,
        level: Optional[int] = None,
        active_only: bool = True,
    ) -> List[AccountCatalog]:
        """List accounts, optionally filtered by type and/or level."""
        stmt = select(AccountCatalog)
        if active_only:
            stmt = stmt.where(AccountCatalog.is_active == True)  # noqa: E712
        if account_type:
            stmt = stmt.where(AccountCatalog.type == account_type)
        if level is not None:
            stmt = stmt.where(AccountCatalog.level == level)
        stmt = stmt.order_by(AccountCatalog.code)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_account_hierarchy(self) -> dict:
        """Return full account hierarchy as a nested dict for UI rendering."""
        accounts = await self.list_accounts(active_only=True)
        by_code = {a.code: a for a in accounts}

        def build_node(code: str) -> dict:
            a = by_code[code]
            node = {
                "code": a.code,
                "name": a.name,
                "type": a.type,
                "natural_balance": a.natural_balance,
                "level": a.level,
                "bank_details": a.bank_details,
            }
            children = [c for c in accounts if c.parent_code == code and c.code != code]
            if children:
                node["children"] = [build_node(c.code) for c in children]
            return node

        # Start from level-0 top groups
        roots = [a for a in accounts if a.level == 0]
        return {"roots": [build_node(r.code) for r in roots]}

    async def validate_account(self, code: str) -> bool:
        """Check that account code exists and is active."""
        account = await self.get_account(code)
        return account is not None and account.is_active

    # ── Utility ─────────────────────────────────────────

    @staticmethod
    def natural_balance_for(account_type: str) -> str:
        """Return 'D' (Debit) or 'C' (Credit) for a given account type."""
        return TYPE_BALANCE.get(account_type, "D")

    @staticmethod
    def is_debit_normal(code: str) -> bool:
        """True if the account normally carries a debit balance."""
        for acct in ALL_ACCOUNTS:
            if acct["code"] == code:
                return acct["natural_balance"] == "D"
        return False
