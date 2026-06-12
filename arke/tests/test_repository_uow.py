import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

from arke.db import OntologyEntity
from arke.repository import SQLModelRepository
from arke.uow import SQLAlchemyAsyncUoW


import pytest_asyncio


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
async def test_repository_crud(session_factory):
    async with SQLAlchemyAsyncUoW(session_factory) as uow:
        repo = SQLModelRepository(OntologyEntity, uow.session)
        obj = OntologyEntity(name="hello")
        await repo.add(obj)
        await uow.commit()

    async with SQLAlchemyAsyncUoW(session_factory) as uow:
        repo = SQLModelRepository(OntologyEntity, uow.session)
        items = await repo.list()
        assert len(items) == 1
        fetched = await repo.get(items[0].id)
        assert fetched is not None and fetched.name == "hello"
        await repo.remove(fetched)
        await uow.commit()

    async with SQLAlchemyAsyncUoW(session_factory) as uow:
        repo = SQLModelRepository(OntologyEntity, uow.session)
        items = await repo.list()
        assert items == []


@pytest.mark.asyncio
async def test_uow_without_commit(session_factory):
    async with SQLAlchemyAsyncUoW(session_factory) as uow:
        repo = SQLModelRepository(OntologyEntity, uow.session)
        await repo.add(OntologyEntity(name="temp"))
        # no commit

    async with SQLAlchemyAsyncUoW(session_factory) as uow:
        repo = SQLModelRepository(OntologyEntity, uow.session)
        assert await repo.list() == []


@pytest.mark.asyncio
async def test_get_uow_sets_state(monkeypatch, session_factory):
    from starlette.requests import Request
    from arke import deps

    class TestUoW(SQLAlchemyAsyncUoW):
        def __init__(self):
            super().__init__(session_factory)

    monkeypatch.setattr(deps, "SQLAlchemyAsyncUoW", TestUoW)

    request = Request({"type": "http", "method": "GET", "path": "/", "headers": []})
    gen = deps.get_uow(request)
    uow = await gen.__anext__()
    assert request.state.uow is uow
    await gen.aclose()


@pytest.mark.asyncio
async def test_request_id_middleware_commits(session_factory):
    from starlette.requests import Request
    from starlette.responses import Response
    from arke.middleware import RequestIDMiddleware

    class App:
        async def __call__(self, scope, receive, send):
            pass

    async def call_next(req: Request) -> Response:
        return Response("ok")

    middleware = RequestIDMiddleware(App())
    request = Request({"type": "http", "method": "GET", "path": "/", "headers": []})

    class DummyUoW(SQLAlchemyAsyncUoW):
        def __init__(self):
            super().__init__(session_factory)
            self.committed = False

        async def commit(self) -> None:
            self.committed = True
            await super().commit()

    uow = DummyUoW()
    await uow.__aenter__()
    request.state.uow = uow
    response = await middleware.dispatch(request, call_next)
    await uow.__aexit__(None, None, None)
    assert request.state.uow.committed is True
    assert response.headers.get("X-Request-ID")
