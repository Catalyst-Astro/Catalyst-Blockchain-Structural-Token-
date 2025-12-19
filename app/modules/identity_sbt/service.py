from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class IdentitySBTService:
    module = "identity_sbt"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Soulbound identity checks active for verified wallets.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="sbt_required",
                name="SBT Required",
                status="ON",
                module=self.module,
                detail="Identity SBT required for participation.",
                updated_at=now,
            ),
            Policy(
                id="sbt_expiry_enforced",
                name="SBT Expiry",
                status="ON",
                module=self.module,
                detail="Expired identity tokens block transfers.",
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
                message="Identity SBT check executed in mock mode.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
