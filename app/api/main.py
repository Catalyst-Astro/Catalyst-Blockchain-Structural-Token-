from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

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

    # ── Security Middleware ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
    )

    class SecurityHeadersMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            response = await call_next(request)
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
            if settings.app_env == "prod":
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            return response

    app.add_middleware(SecurityHeadersMiddleware)

    app.state.settings = settings
    app.state.kernel = kernel
    app.state.arcade = arcade

    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # Mount Catalyst Studio (built React app)
    studio_dir = Path(__file__).parent.parent.parent / "apps" / "catalyst-studio" / "dist"
    if studio_dir.exists():
        app.mount("/studio", StaticFiles(directory=studio_dir, html=True), name="studio")

    app.include_router(api_router)
    return app


app = create_app()
