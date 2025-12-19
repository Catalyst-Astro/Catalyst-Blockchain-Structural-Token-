from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class TokenCoreService:
    module = "token_core"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Token core policies active in mock mode.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="token_symbol",
                name="Token Symbol",
                status="FRT",
                module=self.module,
                detail="Fractal Token",
                updated_at=now,
            ),
            Policy(
                id="token_decimals",
                name="Token Decimals",
                status="18",
                module=self.module,
                detail="EVM standard decimals.",
                updated_at=now,
            ),
            Policy(
                id="token_supply",
                name="Total Supply",
                status="MOCK",
                module=self.module,
                detail="1,000,000 FRT (mock supply)",
                updated_at=now,
            ),
            Policy(
                id="token_minting",
                name="Minting Control",
                status="RESTRICTED",
                module=self.module,
                detail="Owner or DAO-controlled minting.",
                updated_at=now,
            ),
            Policy(
                id="token_enforcement",
                name="Compliance Enforcement",
                status="ON",
                module=self.module,
                detail="Disclosures and whitelist required.",
                updated_at=now,
            ),
        ]

    def emit_events(self) -> list[Event]:
        return [
            Event(
                id=f"{self.module}-{uuid.uuid4().hex}",
                module=self.module,
                type="TOKEN",
                severity="INFO",
                message="Token policy snapshot recorded.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
