import asyncio

import pytest
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from arke.models import OntologyEntity, DecisionRecord, TelemetryRaw


@pytest.mark.asyncio
async def test_sqlite_integration() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with async_session() as session:
        entity = OntologyEntity(name="test")
        session.add(entity)
        await session.commit()
        await session.refresh(entity)

        record = DecisionRecord(entity_id=entity.id, decision="ok")
        session.add(record)
        await session.commit()
        await session.refresh(record)

        assert record.entity_id == entity.id

        telemetry = TelemetryRaw(payload={"a": 1})
        session.add(telemetry)
        await session.commit()
        await session.refresh(telemetry)
        assert telemetry.id is not None
