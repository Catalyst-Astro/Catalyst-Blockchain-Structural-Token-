import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

from arke import SQLAlchemyAsyncUoW, DecisionRecord, manifestar_si_apropiado
from arke.repository import SQLModelRepository


@pytest_asyncio.fixture()
async def session_factory():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_manifestar(session_factory):
    async with SQLAlchemyAsyncUoW(session_factory) as uow:
        result = await manifestar_si_apropiado(uow, "Acción armónica", 0.97)
        assert isinstance(result, dict) and result["estatus"] == "MANIFESTADA"
        repo = SQLModelRepository(DecisionRecord, uow.session)
        items = await repo.list()
        assert len(items) == 1

