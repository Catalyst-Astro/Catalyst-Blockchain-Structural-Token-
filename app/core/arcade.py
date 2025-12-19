from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3
import tempfile
from typing import List, Optional


SEASON_LENGTH_DAYS = 90


class ArcadeStore:
    def __init__(self) -> None:
        db_path = Path(tempfile.gettempdir()) / "catalyst_arcade.db"
        self._conn = sqlite3.connect(db_path)
        self._conn.row_factory = sqlite3.Row
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scores (
                player_id TEXT PRIMARY KEY,
                score INTEGER NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        self._conn.execute(
            """
            CREATE TABLE IF NOT EXISTS season (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                start_at TEXT NOT NULL
            )
            """
        )
        self._conn.commit()

    def submit_score(self, player_id: str, score: int) -> dict:
        now = datetime.now(timezone.utc)
        self._ensure_season_start(now)
        current = self._get_player_score(player_id)
        if current is None or score > current:
            self._conn.execute(
                "INSERT OR REPLACE INTO scores (player_id, score, updated_at) VALUES (?, ?, ?)",
                (player_id, score, now.isoformat()),
            )
            self._conn.commit()
        top = self._get_top_score()
        season_end = self._get_season_end()
        eligible = self._is_season_over(now) and top and top["player_id"] == player_id
        return {
            "player_id": player_id,
            "score": score,
            "top_score": top["score"] if top else 0,
            "is_top": top and top["player_id"] == player_id,
            "season_end": season_end.isoformat(),
            "eligible": bool(eligible),
        }

    def leaderboard(self, limit: int = 10) -> List[dict]:
        cursor = self._conn.execute(
            "SELECT player_id, score, updated_at FROM scores ORDER BY score DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cursor.fetchall()]

    def reward_message(self, player_id: str) -> Optional[str]:
        now = datetime.now(timezone.utc)
        if not self._is_season_over(now):
            return None
        top = self._get_top_score()
        if not top or top["player_id"] != player_id:
            return None
        return (
            "Season winner confirmed. "
            "Present your player key to claim your cooperative inscription and token reward."
        )

    def _ensure_season_start(self, now: datetime) -> None:
        if self._get_season_start() is None:
            self._conn.execute(
                "INSERT INTO season (id, start_at) VALUES (1, ?)",
                (now.isoformat(),),
            )
            self._conn.commit()

    def _get_season_start(self) -> Optional[datetime]:
        cursor = self._conn.execute("SELECT start_at FROM season WHERE id = 1")
        row = cursor.fetchone()
        if row is None:
            return None
        return datetime.fromisoformat(row["start_at"])

    def _get_season_end(self) -> datetime:
        start = self._get_season_start() or datetime.now(timezone.utc)
        return start + timedelta(days=SEASON_LENGTH_DAYS)

    def _is_season_over(self, now: datetime) -> bool:
        start = self._get_season_start()
        if start is None:
            return False
        return now >= start + timedelta(days=SEASON_LENGTH_DAYS)

    def _get_player_score(self, player_id: str) -> Optional[int]:
        cursor = self._conn.execute(
            "SELECT score FROM scores WHERE player_id = ?",
            (player_id,),
        )
        row = cursor.fetchone()
        return row["score"] if row else None

    def _get_top_score(self) -> Optional[dict]:
        cursor = self._conn.execute(
            "SELECT player_id, score FROM scores ORDER BY score DESC LIMIT 1"
        )
        row = cursor.fetchone()
        return dict(row) if row else None
