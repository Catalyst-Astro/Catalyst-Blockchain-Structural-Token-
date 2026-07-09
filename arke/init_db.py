from __future__ import annotations

import asyncio

from arke.db import init_db
from arke.logger import setup_logging


async def main() -> None:
    setup_logging()
    await init_db()


if __name__ == "__main__":
    asyncio.run(main())
