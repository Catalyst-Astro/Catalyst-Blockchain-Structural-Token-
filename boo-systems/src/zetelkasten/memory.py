"""
Zettelkasten Memory — Block Storage (JSON/MD)
═══════════════════════════════════════════════════
Each dialectical cycle is stored as an immutable JSON block.
The blockchain metaphor: each block links to its parent via seal hash.
"""

import json, os, hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Dict
from .engine import ZettelBlock


class BlockMemory:
    """Persistent storage of dialectical blocks."""

    def __init__(self, storage_dir: str = None):
        if storage_dir is None:
            storage_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "data", "zettel_blocks"
            )
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.index: List[str] = []  # Ordered list of block filenames
        self._load_index()

    def _load_index(self):
        """Load existing block index from storage directory."""
        self.index = sorted([
            f for f in os.listdir(self.storage_dir)
            if f.startswith("block_") and f.endswith(".json")
        ])

    def save_block(self, block: ZettelBlock) -> str:
        """Save a dialectical block to storage. Returns the file path."""
        if not block.seal:
            block.compute_seal()

        filename = f"{block.block_id}.json"
        filepath = self.storage_dir / filename

        data = {
            "block_id": block.block_id,
            "phase": block.phase,
            "thesis": block.thesis,
            "antithesis": block.antithesis,
            "synthesis": block.synthesis,
            "conclusion": block.conclusion,
            "forward_action": block.forward_action,
            "reward_score": block.reward_score,
            "confidence": block.confidence,
            "hybrys_score": block.hybrys_score,
            "hybrys_triggered": block.hybrys_triggered,
            "pillars": block.pillars,
            "timestamp": block.timestamp,
            "parent_block_id": block.parent_block_id,
            "metadata": block.metadata,
            "seal": block.seal,
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

        if filename not in self.index:
            self.index.append(filename)

        return str(filepath)

    def load_block(self, block_id: str) -> Optional[Dict]:
        """Load a specific block by ID."""
        filename = f"{block_id}.json"
        filepath = self.storage_dir / filename
        if not filepath.exists():
            return None
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def load_latest_block(self) -> Optional[Dict]:
        """Load the most recent block."""
        if not self.index:
            return None
        latest = sorted(self.index)[-1]
        filepath = self.storage_dir / latest
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_chain(self, limit: int = 10) -> List[Dict]:
        """Get the chain of blocks (most recent first)."""
        blocks = []
        for filename in sorted(self.index, reverse=True)[:limit]:
            filepath = self.storage_dir / filename
            with open(filepath, "r", encoding="utf-8") as f:
                blocks.append(json.load(f))
        return blocks

    def verify_chain(self) -> Dict:
        """Verify the integrity of the entire block chain."""
        results = {"total": len(self.index), "valid": 0, "broken": 0, "orphans": 0}
        seen = set()

        for filename in sorted(self.index):
            filepath = self.storage_dir / filename
            with open(filepath, "r", encoding="utf-8") as f:
                block = json.load(f)

            # Verify seal
            seal_data = json.dumps({
                "block_id": block["block_id"],
                "phase": block["phase"],
                "thesis": block["thesis"],
                "antithesis": block["antithesis"],
                "synthesis": block["synthesis"],
                "conclusion": block["conclusion"],
                "timestamp": block["timestamp"],
                "parent_block_id": block["parent_block_id"],
            }, sort_keys=True, default=str)
            expected_seal = hashlib.sha256(seal_data.encode()).hexdigest()

            if block["seal"] == expected_seal:
                results["valid"] += 1
            else:
                results["broken"] += 1

            # Check parent link
            parent = block.get("parent_block_id")
            if parent and parent not in seen and parent != block["block_id"]:
                results["orphans"] += 1

            seen.add(block["block_id"])

        results["integrity"] = "INTACT" if results["broken"] == 0 else "BROKEN"
        return results

    def count(self) -> int:
        return len(self.index)
