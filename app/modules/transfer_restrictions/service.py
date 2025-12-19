from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class TransferRestrictionsService:
    module = "transfer_restrictions"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Lockups and jurisdiction filters enforced.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="lockups_active",
                name="Lockups Active",
                status="ON",
                module=self.module,
                detail="Time-based lockups applied to restricted wallets.",
                updated_at=now,
            ),
            Policy(
                id="jurisdiction_filter",
                name="Jurisdiction Filter",
                status="ON",
                module=self.module,
                detail="Transfers restricted by jurisdiction policy.",
                updated_at=now,
            ),
            Policy(
                id="purpose_restriction",
                name="Purpose Restriction",
                status="ON",
                module=self.module,
                detail="Transfers require approved purpose hash.",
                updated_at=now,
            ),
        ]

    def emit_events(self) -> list[Event]:
        return [
            Event(
                id=f"{self.module}-{uuid.uuid4().hex}",
                module=self.module,
                type="CHECK",
                severity="INFO",
                message="Transfer restriction rules applied in mock mode.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
