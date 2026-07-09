from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import sessionmaker

from .db import async_session_maker


class AbstractUnitOfWork(ABC):
    session: AsyncSession

    async def __aenter__(self) -> "AbstractUnitOfWork":
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        ...

    @abstractmethod
    async def commit(self) -> None:
        ...


class SQLAlchemyAsyncUoW(AbstractUnitOfWork):
    def __init__(self, session_factory: sessionmaker[AsyncSession] = async_session_maker):
        self.session_factory = session_factory
        self.session: Optional[AsyncSession] = None

    async def __aenter__(self) -> "SQLAlchemyAsyncUoW":
        self.session = self.session_factory()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.session.close()

    async def commit(self) -> None:
        await self.session.commit()
