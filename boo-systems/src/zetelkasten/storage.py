#!/usr/bin/env python3
"""
Block Storage — Persistence, Search, Export (#039, #040)
══════════════════════════════════════════════════════════
BELL 13450.50 | Full CRUD for dialectical blocks.
"""

import json, os, hashlib, sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Generator


class BlockStore:
    """Full block storage with search, pagination, and export."""

    def __init__(self, base_dir: str = None):
        if base_dir is None:
            base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
        self.base = Path(base_dir)
        self.blocks_dir = self.base / "zettel_blocks"
        self.blocks_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.base / "blocks.db"

    # ── CRUD ──

    def save(self, block: Dict) -> str:
        """Save block (create or update)."""
        bid = block.get("block_id", f"BLOCK-{int(datetime.now(timezone.utc).timestamp())}")
        block["block_id"] = bid
        filepath = self.blocks_dir / f"{bid}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(block, f, indent=2, ensure_ascii=False, default=str)
        self._index(bid, block)
        return str(filepath)

    def load(self, block_id: str) -> Optional[Dict]:
        filepath = self.blocks_dir / f"{block_id}.json"
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def list(self, limit: int = 50, offset: int = 0, phase: str = None) -> List[Dict]:
        """List blocks with pagination and filtering."""
        files = sorted(self.blocks_dir.glob("BLOCK-*.json"), reverse=True)
        blocks = []
        for fp in files[offset:offset + limit]:
            with open(fp, "r", encoding="utf-8") as f:
                b = json.load(f)
                if phase and b.get("phase") != phase:
                    continue
                blocks.append(b)
        return blocks[:limit]

    def search(self, query: str, limit: int = 20) -> List[Dict]:
        """Full-text search across all blocks."""
        results = []
        for fp in sorted(self.blocks_dir.glob("*.json"), reverse=True):
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    content = f.read()
                    if query.lower() in content.lower():
                        results.append(json.loads(content))
            except Exception:
                continue
            if len(results) >= limit:
                break
        return results

    def delete(self, block_id: str) -> bool:
        filepath = self.blocks_dir / f"{block_id}.json"
        if filepath.exists():
            os.remove(filepath)
            return True
        return False

    # ── Export (#040) ──

    def export_markdown(self, block_id: str) -> Optional[str]:
        """Export a block as readable Markdown."""
        b = self.load(block_id)
        if not b:
            return None

        md = f"""---
block_id: {b.get('block_id', '?')}
phase: {b.get('phase', '?')}
timestamp: {b.get('timestamp', '?')}
confidence: {b.get('confidence', '?')}
reward: {b.get('reward_score', '?')}
seal: {b.get('seal', '?')[:16]}...
---

# Block {b.get('block_id', '?')}

## Thesis (Top-Down)
{b.get('thesis', '*No thesis recorded*')}

## Antithesis (Bottom-Up)
{b.get('antithesis', '*No antithesis recorded*')}

## Synthesis
{b.get('synthesis', '*No synthesis recorded*')}

## Conclusion / Forward Action
{b.get('conclusion', b.get('forward_action', '*No conclusion recorded*'))}

## Evaluation
- **Confidence:** {b.get('confidence', '?')}/10
- **Reward:** {b.get('reward_score', '?')}/10
- **Hybrys Score:** {b.get('hybrys_score', '?')}
- **Hybrys Triggered:** {b.get('hybrys_triggered', False)}

---

*Seal: {b.get('seal', '?')[:32]}...*
"""
        # Save alongside JSON
        md_path = self.blocks_dir / f"{block_id}.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md)
        return md

    # ── SQLite Index (#042) ──

    def _index(self, block_id: str, block: Dict):
        """Index block metadata in SQLite for fast queries."""
        conn = sqlite3.connect(str(self.db_path))
        conn.execute("""
            CREATE TABLE IF NOT EXISTS blocks (
                id TEXT PRIMARY KEY,
                phase TEXT, timestamp TEXT,
                td_preview TEXT, bu_preview TEXT,
                reward REAL, confidence REAL,
                hybrys_score REAL, hybrys_triggered INTEGER
            )
        """)
        conn.execute("""
            INSERT OR REPLACE INTO blocks VALUES (?,?,?,?,?,?,?,?,?)
        """, (
            block_id, block.get("phase"),
            block.get("timestamp"),
            (block.get("thesis") or "")[:200],
            (block.get("antithesis") or "")[:200],
            block.get("reward_score", 0),
            block.get("confidence", 7),
            block.get("hybrys_score", 0),
            1 if block.get("hybrys_triggered") else 0,
        ))
        conn.commit()
        conn.close()

    def query_db(self, sql: str, params: tuple = ()) -> List[Dict]:
        """Run a SQL query against the block index."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(sql, params).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def stats_by_phase(self) -> Dict:
        """Count blocks per phase."""
        rows = self.query_db("SELECT phase, COUNT(*) as cnt FROM blocks GROUP BY phase")
        return {r["phase"]: r["cnt"] for r in rows}

    def avg_reward_by_phase(self) -> Dict:
        """Average reward per phase."""
        rows = self.query_db("SELECT phase, AVG(reward) as avg_r FROM blocks WHERE reward > 0 GROUP BY phase")
        return {r["phase"]: round(r["avg_r"], 2) for r in rows}
