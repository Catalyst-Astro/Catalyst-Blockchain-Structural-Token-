from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class ListingControlService:
    module = "listing_control"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Listing controls active for permitted venues.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="listing_phase",
                name="Listing Phase",
                status="PRE-LISTING",
                module=self.module,
                detail="Primary distribution only.",
                updated_at=now,
            ),
            Policy(
                id="venues_allowed",
                name="Allowed Venues",
                status="CONFIGURED",
                module=self.module,
                detail="Allowed venues: OTC, private desks.",
                updated_at=now,
            ),
        ]

    def emit_events(self) -> list[Event]:
        return [
            Event(
                id=f"{self.module}-{uuid.uuid4().hex}",
                module=self.module,
                type="LISTING",
                severity="INFO",
                message="Listing policy validated in mock mode.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
