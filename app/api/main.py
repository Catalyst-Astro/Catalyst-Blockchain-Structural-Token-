from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.core.arcade import ArcadeStore
from app.core.kernel import Kernel
from app.core.observability import configure_logging
from app.core.storage import build_storage

from .routes import router as api_router


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.log_level)
    storage = build_storage(settings.data_backend, settings.events_limit)
    kernel = Kernel(settings=settings, storage=storage)
    kernel.load_modules()
    arcade = ArcadeStore()

    app = FastAPI(title="Catalyst Blockchain Core", version="1.0.0")
    app.state.settings = settings
    app.state.kernel = kernel
    app.state.arcade = arcade

    static_dir = Path(__file__).parent / "static"
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    app.include_router(api_router)
    return app


app = create_app()
