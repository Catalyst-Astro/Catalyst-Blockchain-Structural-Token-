from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from .models import DecisionRecord, OntologyEntity, TelemetryRaw
from .settings import Settings


settings = Settings()

# Engine y fábrica de sesiones asíncronas compartidas por la aplicación
database_url = settings.DATABASE_URL or settings.database_uri()
engine = create_async_engine(database_url, echo=settings.DEBUG)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db() -> None:
    """Crea todas las tablas definidas en los modelos SQLModel."""

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)


__all__ = [
    "engine",
    "async_session_maker",
    "init_db",
    "OntologyEntity",
    "DecisionRecord",
    "TelemetryRaw",
]

