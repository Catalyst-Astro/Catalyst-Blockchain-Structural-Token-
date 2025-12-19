from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class SimulationService:
    module = "simulation"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Simulation telemetry available in mock mode.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="ssi_index",
                name="SSI Index",
                status="OK",
                module=self.module,
                detail="SSI=0.62 (last 24h).",
                updated_at=now,
            ),
            Policy(
                id="bai_index",
                name="BAI Index",
                status="OK",
                module=self.module,
                detail="BAI=0.71 (last 24h).",
                updated_at=now,
            ),
        ]

    def emit_events(self) -> list[Event]:
        return [
            Event(
                id=f"{self.module}-{uuid.uuid4().hex}",
                module=self.module,
                type="SIM",
                severity="INFO",
                message="Simulation metrics refreshed.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
