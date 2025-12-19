"""Emergency freeze and pause controls."""

from __future__ import annotations

from app.core.kernel import Kernel
from app.core.models import Event, ModuleStatus, Policy

from .service import FreezeService


class Module:
    name = "freeze"
    version = "1.0.0"

    def __init__(self) -> None:
        self._service = FreezeService()

    def register(self, kernel: Kernel) -> None:
        self._kernel = kernel

    def get_status(self) -> ModuleStatus:
        return self._service.get_status()

    def get_policies(self) -> list[Policy]:
        return self._service.get_policies()

    def emit_events(self) -> list[Event]:
        return self._service.emit_events()
