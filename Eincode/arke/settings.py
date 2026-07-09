from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


def _load_dotenv(path: str = ".env") -> None:
    env_path = Path(path)
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _as_bool(value: str | bool | None, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value: str | int | None, default: int) -> int:
    if isinstance(value, int):
        return value
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class Settings:
    """Application settings loaded from .env and environment variables."""

    def __init__(self) -> None:
        _load_dotenv(".env")

        # App
        self.ENV: str = os.getenv("ENV", "dev")
        self.DEBUG: bool = _as_bool(os.getenv("DEBUG"), False)
        self.APP_NAME: str = os.getenv("APP_NAME", "ARKE")
        self.API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")

        # DB
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./app.db")
        self.POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "db")
        self.POSTGRES_PORT: int = _as_int(os.getenv("POSTGRES_PORT"), 5432)
        self.POSTGRES_DB: str = os.getenv("POSTGRES_DB", "arke")
        self.POSTGRES_USER: str = os.getenv("POSTGRES_USER", "arke_user")
        self.POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "arke_pass")

        # Cache
        self.REDIS_HOST: str = os.getenv("REDIS_HOST", "none")
        self.REDIS_PORT: int = _as_int(os.getenv("REDIS_PORT"), 6379)

        # Auditoria
        self.AUDIT_SECRET: str = os.getenv("AUDIT_SECRET", "dev-secret")
        self.AUDIT_LEDGER_FILE: str = os.getenv("AUDIT_LEDGER_FILE", "./audit.log")
        self.RETENTION_DAYS: int = _as_int(os.getenv("RETENTION_DAYS"), 30)

    def database_uri(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
