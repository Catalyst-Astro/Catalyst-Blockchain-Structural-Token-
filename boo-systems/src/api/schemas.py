"""Boo API Schemas — Pydantic Models (#034)"""
from enum import Enum
from typing import Optional, Dict, List, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class PhaseEnum(str, Enum):
    THESIS = "tesis"
    ANTITHESIS = "antitesis"
    SYNTHESIS = "sintesis"
    CONCLUSION = "conclusion"
    HYBRYS = "hybrys"
    RESET = "reset"


class IntentEnum(str, Enum):
    COMMAND = "command"
    THESIS = "thesis"
    ANTITHESIS = "antithesis"
    QUESTION = "question"
    GENERAL = "general"


class UserInput(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="User input text")
    command_type: Optional[str] = Field(None, description="Explicit command type override")

    @field_validator("text")
    @classmethod
    def sanitize(cls, v: str) -> str:
        return v.strip()[:10000]


class SystemResponse(BaseModel):
    ok: bool
    action: Optional[str] = None
    block_id: Optional[str] = None
    phase: str = "tesis"
    message: str = ""
    hybrys: Optional[Dict] = None
    state: Optional[Dict] = None


class BlockResponse(BaseModel):
    block_id: str
    phase: str
    thesis: Optional[str] = None
    antithesis: Optional[str] = None
    synthesis: Optional[str] = None
    conclusion: Optional[str] = None
    reward_score: Optional[float] = None
    confidence: float = 7.0
    hybrys_score: float = 0.0
    timestamp: str
    seal: str


class SimulationRequest(BaseModel):
    params: Dict[str, Any] = Field(..., description="Simulation parameters")
    synthesis: Optional[str] = Field(None, description="Synthesis text to validate")
    domain: str = Field("general", description="Simulation domain")


class SimulationResponse(BaseModel):
    simulation_id: str
    status: str
    results: Dict[str, Any]
    validated: bool = False
    confidence: float = 7.0
    action: str = "none"


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    uptime_seconds: float = 0.0
    engine_phase: str = "tesis"
    blocks_count: int = 0
    experiments_count: int = 0
    hybrys_count: int = 0


class MetricsResponse(BaseModel):
    total_blocks: int = 0
    total_experiments: int = 0
    hybrys_events: int = 0
    avg_confidence: float = 7.0
    validation_rate: float = 0.0
    uptime_hours: float = 0.0


class ChainResponse(BaseModel):
    blocks: List[BlockResponse]
    integrity: str
    total: int
