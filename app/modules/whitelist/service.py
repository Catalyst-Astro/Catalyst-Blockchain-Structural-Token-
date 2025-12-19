from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class WhitelistService:
    module = "whitelist"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="KYC/AML gate enforced for verified wallets.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="kyc_aml_gate",
                name="KYC/AML Gate",
                status="ON",
                module=self.module,
                detail="Transfers limited to verified participants.",
                updated_at=now,
            ),
            Policy(
                id="travel_rule",
                name="Travel Rule",
                status="ON",
                module=self.module,
                detail="Originator/beneficiary checks required off-chain.",
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
                message="Whitelist policy evaluated in mock mode.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
