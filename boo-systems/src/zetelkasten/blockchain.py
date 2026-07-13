#!/usr/bin/env python3
"""
Blockchain Integration — Hash Chain & Integrity (#041)
═══════════════════════════════════════════════════════
BELL 13450.50 | SHA-256 hash chain linking all blocks.
Each block's seal includes previous block's seal = immutable chain.
"""

import hashlib, json
from typing import Dict, List, Optional


class HashChain:
    """Immutable hash chain linking all dialectical blocks."""

    def __init__(self):
        self.genesis_seal = hashlib.sha256(b"BOO_GENESIS_2026").hexdigest()

    def compute_seal(self, block: Dict, previous_seal: str) -> str:
        """Compute block seal including parent hash."""
        data = json.dumps({
            "block_id": block.get("block_id"),
            "phase": block.get("phase"),
            "thesis": block.get("thesis"),
            "antithesis": block.get("antithesis"),
            "synthesis": block.get("synthesis"),
            "conclusion": block.get("conclusion"),
            "timestamp": block.get("timestamp"),
            "parent_seal": previous_seal,
        }, sort_keys=True, default=str)
        return hashlib.sha256(data.encode()).hexdigest()

    def build_chain(self, blocks: List[Dict]) -> List[Dict]:
        """Build a complete hash chain from ordered blocks."""
        chained = []
        prev_seal = self.genesis_seal

        for block in sorted(blocks, key=lambda b: b.get("timestamp", "")):
            seal = self.compute_seal(block, prev_seal)
            block["seal"] = seal
            block["parent_seal"] = prev_seal
            chained.append(block)
            prev_seal = seal

        return chained

    def verify_chain(self, blocks: List[Dict]) -> Dict:
        """Verify the integrity of the entire chain."""
        if not blocks:
            return {"valid": True, "total": 0, "broken": 0, "status": "EMPTY"}

        sorted_blocks = sorted(blocks, key=lambda b: b.get("timestamp", ""))
        prev_seal = self.genesis_seal
        broken = 0

        for i, block in enumerate(sorted_blocks):
            expected = self.compute_seal(block, prev_seal)
            actual = block.get("seal", "")
            if expected != actual:
                broken += 1
            prev_seal = actual or expected

        return {
            "valid": broken == 0,
            "total": len(blocks),
            "broken": broken,
            "status": "INTACT" if broken == 0 else "BROKEN",
            "last_seal": (sorted_blocks[-1].get("seal", "") if sorted_blocks else "")[:32],
        }

    def export_chain(self, blocks: List[Dict]) -> str:
        """Export the full chain as JSON."""
        chained = self.build_chain(blocks)
        return json.dumps({
            "genesis": self.genesis_seal,
            "blocks": [{
                "id": b.get("block_id"),
                "seal": b.get("seal", "")[:32],
                "parent": b.get("parent_seal", "")[:32],
                "phase": b.get("phase"),
            } for b in chained],
            "integrity": self.verify_chain(chained)["status"],
        }, indent=2)

    def find_break(self, blocks: List[Dict]) -> Optional[int]:
        """Find the first broken link in the chain."""
        result = self.verify_chain(blocks)
        if result["valid"]:
            return None

        sorted_blocks = sorted(blocks, key=lambda b: b.get("timestamp", ""))
        prev_seal = self.genesis_seal
        for i, block in enumerate(sorted_blocks):
            if self.compute_seal(block, prev_seal) != block.get("seal", ""):
                return i
            prev_seal = block.get("seal", "")
        return None
