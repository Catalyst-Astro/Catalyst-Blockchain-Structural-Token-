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
    geth_rpc_url: str = "http://127.0.0.1:8545"
    cors_origins: List[str] = ("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000")


def _parse_modules(raw: str | None) -> List[str]:
    if raw:
        return [module.strip() for module in raw.split(",") if module.strip()]
    return DEFAULT_MODULES.copy()


def get_settings() -> Settings:
    cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000")
    cors_origins = [o.strip() for o in cors_raw.split(",") if o.strip()]
    return Settings(
        app_env=os.getenv("APP_ENV", "dev"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        data_backend=os.getenv("DATA_BACKEND", "memory"),
        events_limit=int(os.getenv("EVENTS_LIMIT", "50")),
        modules=_parse_modules(os.getenv("MODULES")),
        geth_rpc_url=os.getenv("GETH_RPC_URL", "http://127.0.0.1:8545"),
        cors_origins=cors_origins,
    )
