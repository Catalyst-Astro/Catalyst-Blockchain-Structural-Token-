from __future__ import annotations

from datetime import datetime, timezone
import importlib
from typing import List, Protocol

from .config import Settings
from .models import Event, ModuleInfo, ModuleStatus, Policy, SystemStatus
from .storage import StorageBackend


class IModule(Protocol):
    name: str
    version: str

    def register(self, kernel: "Kernel") -> None:
        ...

    def get_status(self) -> ModuleStatus:
        ...

    def get_policies(self) -> List[Policy]:
        ...

    def emit_events(self) -> List[Event]:
        ...


class Kernel:
    def __init__(self, settings: Settings, storage: StorageBackend) -> None:
        self.settings = settings
        self.storage = storage
        self.modules: List[IModule] = []
        self._loaded = False

    def load_modules(self) -> None:
        if self._loaded:
            return
        for module_name in self.settings.modules:
            module_path = f"app.modules.{module_name}.module"
            module = importlib.import_module(module_path)
            instance: IModule = module.Module()
            instance.register(self)
            self.modules.append(instance)
        self._loaded = True

    def list_modules(self) -> List[ModuleInfo]:
        return [
            ModuleInfo(name=module.name, version=module.version, description=module.__doc__)
            for module in self.modules
        ]

    def get_statuses(self) -> List[ModuleStatus]:
        return [module.get_status() for module in self.modules]

    def get_policies(self) -> List[Policy]:
        policies: List[Policy] = []
        for module in self.modules:
            policies.extend(module.get_policies())
        return policies

    def collect_events(self) -> List[Event]:
        events: List[Event] = []
        for module in self.modules:
            events.extend(module.emit_events())
        if events:
            self.storage.append_events(events)
        return self.storage.list_events(self.settings.events_limit)

    def get_system_status(self) -> SystemStatus:
        statuses = self.get_statuses()
        policies = self.get_policies()
        events = self.storage.list_events(self.settings.events_limit)
        overall = self._overall_status(statuses)
        now = datetime.now(timezone.utc)
        return SystemStatus(
            status=overall,
            updated_at=now,
            module_count=len(statuses),
            policy_count=len(policies),
            event_count=len(events),
        )

    @staticmethod
    def _overall_status(statuses: List[ModuleStatus]) -> str:
        priority = {"NORMAL": 0, "DEGRADED": 1, "EMERGENCY": 2}
        current = 0
        for status in statuses:
            current = max(current, priority.get(status.status.upper(), 0))
        for key, value in priority.items():
            if value == current:
                return key
        return "NORMAL"
