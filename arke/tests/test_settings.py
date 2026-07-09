from typing import Any

from arke.settings import Settings


def test_default_database_uri() -> None:
    settings = Settings()
    assert settings.database_uri() == (
        "postgresql+asyncpg://arke_user:arke_pass@db:5432/arke"
    )


def test_env_overrides(monkeypatch: Any) -> None:
    monkeypatch.setenv("POSTGRES_USER", "user")
    monkeypatch.setenv("POSTGRES_PASSWORD", "pass")
    monkeypatch.setenv("POSTGRES_HOST", "host")
    monkeypatch.setenv("POSTGRES_PORT", "1234")
    monkeypatch.setenv("POSTGRES_DB", "db")

    settings = Settings()
    assert settings.database_uri() == (
        "postgresql+asyncpg://user:pass@host:1234/db"
    )
