"""Token core policy module."""

from __future__ import annotations

from app.core.kernel import Kernel
from app.core.models import Event, ModuleStatus, Policy

from .service import TokenCoreService


class Module:
    name = "token_core"
    version = "1.0.0"

    def __init__(self) -> None:
        self._service = TokenCoreService()

    def register(self, kernel: Kernel) -> None:
        self._kernel = kernel

    def get_status(self) -> ModuleStatus:
        return self._service.get_status()

    def get_policies(self) -> list[Policy]:
        return self._service.get_policies()

    def emit_events(self) -> list[Event]:
        return self._service.emit_events()
