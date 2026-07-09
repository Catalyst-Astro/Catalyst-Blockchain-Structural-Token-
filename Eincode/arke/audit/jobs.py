from __future__ import annotations

from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import delete

from arke.models import DecisionRecord, TelemetryRaw
from arke.uow import SQLAlchemyAsyncUoW
from arke.settings import get_settings


async def purge_old() -> None:
    settings = get_settings()
    cutoff = datetime.utcnow() - timedelta(days=settings.RETENTION_DAYS)
    async with SQLAlchemyAsyncUoW() as uow:
        await uow.session.exec(
            delete(DecisionRecord).where(
                DecisionRecord.created_at < cutoff, DecisionRecord.decision.is_(None)
            )
        )
        await uow.session.exec(
            delete(TelemetryRaw).where(
                TelemetryRaw.received_at < cutoff, TelemetryRaw.payload.is_(None)
            )
        )
        await uow.commit()


def start_cleanup_job() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(purge_old, "cron", hour=3)
    scheduler.start()
    return scheduler
