from __future__ import annotations

from typing import Iterable, List, Protocol
import json
import sqlite3
from pathlib import Path
import tempfile

from .models import Event


class StorageBackend(Protocol):
    def append_events(self, events: Iterable[Event]) -> None:
        ...

    def list_events(self, limit: int) -> List[Event]:
        ...


class InMemoryStorage:
    def __init__(self, max_events: int) -> None:
        self._events: List[Event] = []
        self._max_events = max_events

    def append_events(self, events: Iterable[Event]) -> None:
        self._events.extend(list(events))
        if len(self._events) > self._max_events:
            self._events = self._events[-self._max_events :]

    def list_events(self, limit: int) -> List[Event]:
        if limit <= 0:
            return []
        return list(reversed(self._events[-limit:]))


class SQLiteStorage:
    def __init__(self, path: str, max_events: int) -> None:
        self._path = Path(path)
        self._max_events = max_events
        self._conn = sqlite3.connect(self._path)
        self._conn.row_factory = sqlite3.Row
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                module TEXT NOT NULL,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                ref_hash TEXT,
                metadata TEXT
            )
            """
        )
        self._conn.commit()

    def append_events(self, events: Iterable[Event]) -> None:
        rows = [self._event_to_row(event) for event in events]
        self._conn.executemany(
            """
            INSERT OR IGNORE INTO events (
                id, module, type, severity, message, timestamp, ref_hash, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        self._trim_events()
        self._conn.commit()

    def list_events(self, limit: int) -> List[Event]:
        if limit <= 0:
            return []
        cursor = self._conn.execute(
            """
            SELECT id, module, type, severity, message, timestamp, ref_hash, metadata
            FROM events
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,),
        )
        return [self._row_to_event(row) for row in cursor.fetchall()]

    def _trim_events(self) -> None:
        cursor = self._conn.execute("SELECT COUNT(1) AS total FROM events")
        total = cursor.fetchone()["total"]
        if total <= self._max_events:
            return
        offset = total - self._max_events
        self._conn.execute(
            """
            DELETE FROM events
            WHERE id IN (
                SELECT id FROM events
                ORDER BY timestamp ASC
                LIMIT ?
            )
            """,
            (offset,),
        )

    def _event_to_row(self, event: Event) -> tuple:
        data = event.dict()
        return (
            data["id"],
            data["module"],
            data["type"],
            data["severity"],
            data["message"],
            data["timestamp"].isoformat(),
            data.get("ref_hash"),
            json.dumps(data.get("metadata") or {}),
        )

    def _row_to_event(self, row: sqlite3.Row) -> Event:
        metadata = json.loads(row["metadata"]) if row["metadata"] else {}
        return Event(
            id=row["id"],
            module=row["module"],
            type=row["type"],
            severity=row["severity"],
            message=row["message"],
            timestamp=row["timestamp"],
            ref_hash=row["ref_hash"],
            metadata=metadata,
        )


def build_storage(data_backend: str, max_events: int) -> StorageBackend:
    if data_backend.lower() == "sqlite":
        db_path = Path(tempfile.gettempdir()) / "catalyst_core.db"
        return SQLiteStorage(str(db_path), max_events=max_events)
    return InMemoryStorage(max_events=max_events)
