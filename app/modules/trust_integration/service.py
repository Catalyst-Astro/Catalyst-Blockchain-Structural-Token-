from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class TrustIntegrationService:
    module = "trust_integration"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Trust registry synced in mock mode.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="trust_active",
                name="Trust Status",
                status="ACTIVE",
                module=self.module,
                detail="2 trust ids active.",
                updated_at=now,
            ),
            Policy(
                id="revenue_reports",
                name="Revenue Reports",
                status="OK",
                module=self.module,
                detail="Last report hash: 0x" + "0" * 64,
                updated_at=now,
            ),
        ]

    def emit_events(self) -> list[Event]:
        return [
            Event(
                id=f"{self.module}-{uuid.uuid4().hex}",
                module=self.module,
                type="TRUST",
                severity="INFO",
                message="Trust registry heartbeat recorded.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
