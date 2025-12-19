from __future__ import annotations

from dataclasses import dataclass
import os
from typing import List

DEFAULT_MODULES: List[str] = [
    "whitelist",
    "token_core",
    "identity_sbt",
    "transfer_restrictions",
    "freeze",
    "compliance_dao",
    "trust_integration",
    "simulation",
    "operations_audit",
    "listing_control",
]


@dataclass(frozen=True)
class Settings:
    app_env: str
    log_level: str
    data_backend: str
    events_limit: int
    modules: List[str]


def _parse_modules(raw: str | None) -> List[str]:
    if raw:
        return [module.strip() for module in raw.split(",") if module.strip()]
    return DEFAULT_MODULES.copy()


def get_settings() -> Settings:
    return Settings(
        app_env=os.getenv("APP_ENV", "dev"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        data_backend=os.getenv("DATA_BACKEND", "memory"),
        events_limit=int(os.getenv("EVENTS_LIMIT", "50")),
        modules=_parse_modules(os.getenv("MODULES")),
    )
