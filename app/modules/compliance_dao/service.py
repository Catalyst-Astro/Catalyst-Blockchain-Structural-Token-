from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class ComplianceDAOService:
    module = "compliance_dao"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Governance compliance checks configured.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="dao_quorum",
                name="DAO Quorum",
                status="CONFIGURED",
                module=self.module,
                detail="Quorum set at 15% of circulating supply.",
                updated_at=now,
            ),
            Policy(
                id="vote_period",
                name="Voting Period",
                status="CONFIGURED",
                module=self.module,
                detail="Voting period set to 7 days.",
                updated_at=now,
            ),
            Policy(
                id="guardian_enabled",
                name="Guardian Veto",
                status="ON",
                module=self.module,
                detail="Guardian can pause or reject proposals.",
                updated_at=now,
            ),
        ]

    def emit_events(self) -> list[Event]:
        return [
            Event(
                id=f"{self.module}-{uuid.uuid4().hex}",
                module=self.module,
                type="GOV",
                severity="INFO",
                message="Governance policy check completed in mock mode.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
