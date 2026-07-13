"""Boo API Routes — FastAPI Endpoints (#033, #036, #038)"""
import sys, os, time, hashlib
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.zetelkasten.engine import DialecticalEngine
from src.zetelkasten.memory import BlockMemory
from src.zetelkasten.commands import CommandParser
from src.boo.pipeline import ValidationPipeline
from src.api.schemas import (
    UserInput, SystemResponse, BlockResponse, HealthResponse,
    MetricsResponse, SimulationRequest, SimulationResponse, ChainResponse,
)

# ── App ──
app = FastAPI(
    title="Boo Systems API",
    description="Zettelkasten Dialectical AI Engine + Boo Physics Simulator",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

start_time = time.time()
engine = DialecticalEngine()
memory = BlockMemory()
parser = CommandParser(engine, memory)
pipeline = ValidationPipeline()

API_KEY = os.environ.get("BOO_API_KEY", "boo-dev-key-2026")

# ── Auth (#035) ──
def verify_api_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API Key. Use X-API-Key header.")
    return x_api_key


# ── POST /process (#033) ──
@app.post("/process", response_model=SystemResponse, tags=["Engine"])
async def process_input(inp: UserInput, api_key: str = Depends(verify_api_key)):
    try:
        result = parser.parse(inp.text)
        return SystemResponse(**result)
    except Exception as e:
        return SystemResponse(ok=False, message=str(e), phase=engine.phase.value)


# ── GET /status (#038) ──
@app.get("/status", response_model=HealthResponse, tags=["Health"])
async def health():
    state = engine.get_state()
    return HealthResponse(
        status="ok",
        version="1.0.0",
        uptime_seconds=time.time() - start_time,
        engine_phase=state["phase"],
        blocks_count=memory.count(),
        experiments_count=len(pipeline.tracker.experiments),
        hybrys_count=pipeline.notifier.hybrys_count,
    )


# ── GET /blocks ──
@app.get("/blocks", response_model=ChainResponse, tags=["Memory"])
async def get_blocks(limit: int = Query(10, ge=1, le=100), api_key: str = Depends(verify_api_key)):
    chain = memory.get_chain(limit)
    blocks = [BlockResponse(**b) for b in chain]
    integrity = memory.verify_chain()["integrity"]
    return ChainResponse(blocks=blocks, integrity=integrity, total=len(chain))


# ── GET /blocks/{id} ──
@app.get("/blocks/{block_id}", response_model=BlockResponse, tags=["Memory"])
async def get_block(block_id: str, api_key: str = Depends(verify_api_key)):
    b = memory.load_block(block_id)
    if not b:
        raise HTTPException(404, f"Block {block_id} not found")
    return BlockResponse(**b)


# ── POST /simulate (#033) ──
@app.post("/simulate", response_model=SimulationResponse, tags=["Boo"])
async def simulate(req: SimulationRequest, api_key: str = Depends(verify_api_key)):
    result = pipeline.validate(req.synthesis or "General simulation", req.params)
    return SimulationResponse(
        simulation_id=result.experiment_id,
        status="COMPLETED",
        results=result.simulation,
        validated=result.validated,
        confidence=result.confidence_update.get("confidence", 7.0),
        action=result.action,
    )


# ── GET /metrics (#038) ──
@app.get("/metrics", response_model=MetricsResponse, tags=["Health"])
async def metrics(api_key: str = Depends(verify_api_key)):
    stats = pipeline.pipeline_stats()
    return MetricsResponse(
        total_blocks=memory.count(),
        total_experiments=stats.get("experiments", {}).get("total", 0),
        hybrys_events=pipeline.notifier.hybrys_count,
        avg_confidence=stats.get("confidence", {}).get("confidence", 7.0),
        validation_rate=stats.get("validation_rate", 0),
        uptime_hours=(time.time() - start_time) / 3600,
    )


# ── GET /chain/verify ──
@app.get("/chain/verify", tags=["Memory"])
async def verify_chain(api_key: str = Depends(verify_api_key)):
    return memory.verify_chain()


# ── GET /notifications ──
@app.get("/notifications", tags=["System"])
async def notifications(limit: int = 20, api_key: str = Depends(verify_api_key)):
    return {
        "summary": pipeline.notifier.summary(),
        "recent": [n.format() for n in pipeline.notifier.recent(limit)],
    }


# ── WebSocket /ws (#033) ──
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"type": "connected", "phase": engine.phase.value})
    try:
        while True:
            data = await websocket.receive_text()
            result = parser.parse(data)
            await websocket.send_json(result)
    except WebSocketDisconnect:
        pass


# ── Health (no auth) ──
@app.get("/health")
async def health_noauth():
    return {"status": "ok", "version": "1.0.0"}
