from __future__ import annotations

from datetime import datetime, timezone
import uuid

from app.core.models import Event, ModuleStatus, Policy


class OperationsAuditService:
    module = "operations_audit"

    def get_status(self) -> ModuleStatus:
        return ModuleStatus(
            name=self.module,
            status="NORMAL",
            detail="Operational audit checkpoints running.",
            updated_at=_now(),
        )

    def get_policies(self) -> list[Policy]:
        now = _now()
        return [
            Policy(
                id="audit_checkpoints",
                name="Audit Checkpoints",
                status="ON",
                module=self.module,
                detail="Last checkpoint: 2025-12-19T09:00:00Z",
                updated_at=now,
            ),
            Policy(
                id="audit_trail",
                name="Audit Trail",
                status="ON",
                module=self.module,
                detail="Hash anchoring enabled.",
                updated_at=now,
            ),
        ]

    def emit_events(self) -> list[Event]:
        return [
            Event(
                id=f"{self.module}-{uuid.uuid4().hex}",
                module=self.module,
                type="AUDIT",
                severity="INFO",
                message="Audit checkpoint stored.",
                timestamp=_now(),
                ref_hash="0x" + "0" * 64,
            )
        ]


def _now() -> datetime:
    return datetime.now(timezone.utc)
