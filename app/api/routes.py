from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from pydantic import BaseModel, Field

from app.core.models import SystemStatus

from .dashboard import render_dashboard_html
from .auth import router as auth_router

router = APIRouter()
router.include_router(auth_router)


class ArcadeScoreIn(BaseModel):
    player_id: str = Field(..., min_length=8, max_length=128)
    score: int = Field(..., ge=0)


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


@router.post("/api/arcade/submit")
def arcade_submit(payload: ArcadeScoreIn, request: Request):
    arcade = request.app.state.arcade
    result = arcade.submit_score(payload.player_id, payload.score)
    message = arcade.reward_message(payload.player_id)
    result["reward_message"] = message
    return result


@router.get("/api/arcade/leaderboard")
def arcade_leaderboard(request: Request):
    arcade = request.app.state.arcade
    return arcade.leaderboard()


# ── RPC Proxy (re-envía llamadas JSON-RPC al nodo Geth local) ──
import httpx

@router.post("/api/rpc")
async def rpc_proxy(request: Request):
    """Proxy JSON-RPC calls to the local Geth node (http://127.0.0.1:8545)."""
    body = await request.json()
    rpc_url = request.app.state.settings.geth_rpc_url or "http://127.0.0.1:8545"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(rpc_url, json=body)
        return resp.json()
