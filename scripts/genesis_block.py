#!/usr/bin/env python3
"""Generate the symbolic Genesis Block for the Catalyst blockchain.

This script creates a ``GenesisBlock`` object populated with ceremonial
fields and computes a SHA3-512 hash over its JSON representation. The
block is exported to ``genesis_block.json`` and the resulting hash is
printed for ritual verification.
"""
from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass, asdict
from datetime import datetime
import json


@dataclass
class GenesisBlock:
    """Data structure representing the Genesis Block."""

    block_id: int = 0
    timestamp: str = datetime.utcnow().isoformat()
    proposito: str = "Activación Fractal para gobernanza simbólica"
    principio: str = "Equilibrio"
    glifo_hash: str = ""
    dao_madre: str = "DAO-CATALYST-001"
    entropy_seed: str = secrets.token_hex(32)

    def to_dict(self) -> dict:
        """Return the block as a serialisable dictionary."""
        return asdict(self)


def hash_svg(svg: str) -> str:
    """Hash SVG content using SHA3-256 to derive a glyph identifier."""
    return hashlib.sha3_256(svg.encode()).hexdigest()


def compute_genesis_hash(block: GenesisBlock) -> str:
    """Produce a SHA3-512 hash of the block's canonical JSON."""
    block_json = json.dumps(block.to_dict(), sort_keys=True).encode()
    return hashlib.sha3_512(block_json).hexdigest()


if __name__ == "__main__":
    # Example SVG symbol used to derive the glyph hash
    GLIFO_SVG = "<svg xmlns='http://www.w3.org/2000/svg'></svg>"

    block = GenesisBlock(glifo_hash=hash_svg(GLIFO_SVG))
    genesis_hash = compute_genesis_hash(block)

    with open("genesis_block.json", "w", encoding="utf-8") as f:
        json.dump(block.to_dict(), f, ensure_ascii=False, indent=2, sort_keys=True)

    print("\n===== Ceremonia de Génesis =====")
    print(json.dumps(block.to_dict(), ensure_ascii=False, indent=2))
    print(f"\nHash Génesis (SHA3-512): {genesis_hash}\n")

