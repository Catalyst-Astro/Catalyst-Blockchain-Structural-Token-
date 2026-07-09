from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class OntologyEntity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = Field(default=None, foreign_key="ontologyentity.id")


class DecisionRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_id: Optional[int] = Field(default=None, foreign_key="ontologyentity.id")
    decision: str
    rationale: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TelemetryRaw(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_id: Optional[int] = Field(default=None, foreign_key="ontologyentity.id")
    payload: dict = Field(sa_column=Column(JSON))
    received_at: datetime = Field(default_factory=datetime.utcnow)
