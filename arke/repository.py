from __future__ import annotations

from typing import Generic, TypeVar, Protocol, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

T = TypeVar("T", bound=SQLModel)


class AbstractRepository(Protocol, Generic[T]):
    async def add(self, obj: T) -> None:
        ...

    async def get(self, id_: int) -> Optional[T]:
        ...

    async def list(self) -> List[T]:
        ...

    async def remove(self, obj: T) -> None:
        ...


class SQLModelRepository(Generic[T]):
    def __init__(self, model: type[T], session: AsyncSession):
        self.model = model
        self.session = session

    async def add(self, obj: T) -> None:
        self.session.add(obj)

    async def get(self, id_: int) -> Optional[T]:
        result = await self.session.exec(select(self.model).where(self.model.id == id_))
        return result.first()

    async def list(self) -> List[T]:
        result = await self.session.exec(select(self.model))
        return result.all()

    async def remove(self, obj: T) -> None:
        await self.session.delete(obj)
