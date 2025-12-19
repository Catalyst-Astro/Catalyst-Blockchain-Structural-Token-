from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class FreezeService:
    module = "freeze"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Freeze controls ready for emergency response.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="freeze_wallets",
                name="Wallet Freeze",
                status="OFF",
                module=self.module,
                detail="0 wallets frozen.",
                updated_at=now,
            ),
            Policy(
                id="freeze_series",
                name="Series Freeze",
                status="OFF",
                module=self.module,
                detail="No token series frozen.",
                updated_at=now,
            ),
            Policy(
                id="freeze_functions",
                name="Function Freeze",
                status="OFF",
                module=self.module,
                detail="No contract functions frozen.",
                updated_at=now,
            ),
        ]

    def emit_events(self) -> list[Event]:
        return [
            Event(
                id=f"{self.module}-{uuid.uuid4().hex}",
                module=self.module,
                type="ALERT",
                severity="INFO",
                message="Freeze module standby status confirmed.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
