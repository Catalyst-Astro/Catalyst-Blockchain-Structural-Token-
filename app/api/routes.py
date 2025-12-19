from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response

from app.core.models import SystemStatus

from .dashboard import render_dashboard_html

router = APIRouter()


@router.get("/health")
def health(request: Request) -> dict:
    settings = request.app.state.settings
    kernel = request.app.state.kernel
    status: SystemStatus = kernel.get_system_status()
    return {
        "status": "ok",
        "app_env": settings.app_env,
        "modules": status.module_count,
        "policies": status.policy_count,
        "events": status.event_count,
        "build": "catalyst-core",
    }


@router.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/dashboard")


@router.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    return Response(status_code=204)


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request) -> str:
    kernel = request.app.state.kernel
    settings = request.app.state.settings
    statuses = kernel.get_statuses()
    policies = kernel.get_policies()
    events = kernel.collect_events()
    system_status = kernel.get_system_status()
    return render_dashboard_html(system_status, statuses, policies, events, settings)


@router.get("/api/status")
def api_status(request: Request) -> SystemStatus:
    kernel = request.app.state.kernel
    return kernel.get_system_status()


@router.get("/api/modules")
def api_modules(request: Request):
    kernel = request.app.state.kernel
    return kernel.list_modules()


@router.get("/api/policies")
def api_policies(request: Request):
    kernel = request.app.state.kernel
    return kernel.get_policies()


@router.get("/api/events")
def api_events(request: Request):
    kernel = request.app.state.kernel
    return kernel.collect_events()
