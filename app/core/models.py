from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ModuleInfo(BaseModel):
    name: str
    version: str
    description: Optional[str] = None


class ModuleStatus(BaseModel):
    name: str
    status: str
    detail: str
    updated_at: datetime


class Policy(BaseModel):
    id: str
    name: str
    status: str
    module: str
    detail: Optional[str] = None
    updated_at: datetime


class Event(BaseModel):
    id: str
    module: str
    type: str
    severity: str
    message: str
    timestamp: datetime
    ref_hash: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SystemStatus(BaseModel):
    status: str
    updated_at: datetime
    module_count: int
    policy_count: int
    event_count: int
