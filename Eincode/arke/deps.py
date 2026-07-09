from __future__ import annotations

from typing import AsyncGenerator

from fastapi import Request

from .uow import SQLAlchemyAsyncUoW


async def get_uow(request: Request) -> AsyncGenerator[SQLAlchemyAsyncUoW, None]:
    async with SQLAlchemyAsyncUoW() as uow:
        request.state.uow = uow
        yield uow
