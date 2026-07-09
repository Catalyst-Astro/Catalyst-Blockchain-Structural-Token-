from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Column, JSON, Float
from sqlmodel import Field, SQLModel


class OntologyEntity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = Field(default=None, foreign_key="ontologyentity.id")


class DecisionRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: Optional[int] = Field(default=None, foreign_key="ontologyentity.id")
    decision: str
    rationale: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TelemetryRaw(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_id: Optional[int] = Field(default=None, foreign_key="ontologyentity.id")
    payload: dict = Field(sa_column=Column(JSON))
    received_at: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────────
#  CATALYST BANK ACCOUNTING TABLES
#  NIF-aligned double-entry bookkeeping system
# ──────────────────────────────────────────────


class AccountCatalog(SQLModel, table=True):
    """Catálogo de Cuentas — NIF-aligned chart of accounts (58 cuentas)."""
    __tablename__ = "account_catalog"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True, max_length=4)
    name: str
    type: str = Field(max_length=1)                         # A=Asset L=Liability E=Equity I=Income X=Expense M=Memorandum
    natural_balance: str = Field(max_length=1)               # D=Debit C=Credit
    level: int = Field(default=1)                            # 1=Grupo 2=Mayor 3=Subcuenta
    parent_code: Optional[str] = Field(default=None, max_length=4, foreign_key="account_catalog.code")
    is_active: bool = Field(default=True)
    description: Optional[str] = None
    bank_details: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class JournalEntry(SQLModel, table=True):
    """Diario Contable — double-entry journal headers."""
    __tablename__ = "journal_entry"

    id: Optional[int] = Field(default=None, primary_key=True)
    entry_id: str = Field(index=True, unique=True)           # JE-20260617-001
    entry_date: date = Field(index=True)
    description: str
    source: str                                              # QR_TRIGGER, SWIFT, SPEI, BURN, MINT, FEE, OPENING, CLOSING, DAILY
    reference_type: Optional[str] = None                     # SETTLEMENT_LOG, COBRAR, QUOTATION
    reference_id: Optional[str] = None
    total_debit: float = Field(default=0.0)
    total_credit: float = Field(default=0.0)
    is_posted: bool = Field(default=True)
    is_opening: bool = Field(default=False)
    proof_hash: Optional[str] = None                        # SHA-256 del asiento
    created_at: datetime = Field(default_factory=datetime.utcnow)
    posted_by: Optional[str] = Field(default="system")


class JournalEntryLine(SQLModel, table=True):
    """Líneas del Diario — individual debit/credit legs."""
    __tablename__ = "journal_entry_line"

    id: Optional[int] = Field(default=None, primary_key=True)
    entry_id: str = Field(index=True, foreign_key="journal_entry.entry_id")
    account_code: str = Field(index=True, foreign_key="account_catalog.code")
    description: str
    debit: float = Field(default=0.0)
    credit: float = Field(default=0.0)
    currency: str = Field(default="CNY")                     # CNY, MXN, USD, CAT
    asset_type: Optional[str] = None                         # CAT, GNC, FLT, CTV, FRT, MXN, CNY, USD
    onchain_tx_hash: Optional[str] = None
    settlement_log_id: Optional[int] = None


class AccountBalance(SQLModel, table=True):
    """Saldos por Cuenta — daily running balances."""
    __tablename__ = "account_balance"

    id: Optional[int] = Field(default=None, primary_key=True)
    account_code: str = Field(index=True, foreign_key="account_catalog.code")
    as_of_date: date = Field(index=True)
    opening_balance: float = Field(default=0.0)
    total_debit: float = Field(default=0.0)
    total_credit: float = Field(default=0.0)
    closing_balance: float = Field(default=0.0)
    currency: str = Field(default="CNY")
    is_reconciled: bool = Field(default=False)
    reconciled_at: Optional[datetime] = None


class ReconciliationLog(SQLModel, table=True):
    """Conciliación — on-chain to accounting reconciliation."""
    __tablename__ = "reconciliation_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    reconciliation_date: date = Field(index=True)
    source: str                                              # SETTLEMENT_LOG, DAILY_REPORT, QR_TRIGGER
    source_count: int = Field(default=0)
    journal_entry_count: int = Field(default=0)
    total_source_amount: float = Field(default=0.0)
    total_journal_amount: float = Field(default=0.0)
    variance: float = Field(default=0.0)
    is_matched: bool = Field(default=False)
    proof_hash: Optional[str] = None
    details: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DailyClosure(SQLModel, table=True):
    """Cierre Contable Diario — P13 accounting close record."""
    __tablename__ = "daily_closure"

    id: Optional[int] = Field(default=None, primary_key=True)
    close_date: date = Field(index=True, unique=True)
    total_assets: float = Field(default=0.0)
    total_liabilities: float = Field(default=0.0)
    total_equity: float = Field(default=0.0)
    total_income: float = Field(default=0.0)
    total_expenses: float = Field(default=0.0)
    net_income: float = Field(default=0.0)
    trial_balance_count: int = Field(default=0)
    trial_balance_total: float = Field(default=0.0)
    report_seal: Optional[str] = None
    closure_hash: Optional[str] = None
    is_verified: bool = Field(default=False)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
