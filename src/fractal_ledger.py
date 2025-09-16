"""Minimal distributed ledger with fractal nodes."""

from __future__ import annotations

import json
import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import Any, List
from copy import deepcopy
from uuid import uuid4


@dataclass
class Block:
    """Represents a single block in the ledger."""

    index: int
    timestamp: str
    data: Any
    previous_hash: str
    hash: str

    @staticmethod
    def calculate_hash(index: int, timestamp: str, data: Any, previous_hash: str) -> str:
        payload = json.dumps(
            {
                "index": index,
                "timestamp": timestamp,
                "data": data,
                "previous_hash": previous_hash,
            },
            sort_keys=True,
        ).encode()
        return hashlib.sha3_512(payload).hexdigest()

    @classmethod
    def create_genesis(cls) -> "Block":
        timestamp = datetime.utcnow().isoformat()
        genesis_hash = cls.calculate_hash(0, timestamp, "genesis", "0")
        return cls(0, timestamp, "genesis", "0", genesis_hash)

    @classmethod
    def create_block(cls, index: int, data: Any, previous_hash: str) -> "Block":
        timestamp = datetime.utcnow().isoformat()
        block_hash = cls.calculate_hash(index, timestamp, data, previous_hash)
        return cls(index, timestamp, data, previous_hash, block_hash)


class FractalLedger:
    """Simple ledger maintaining a chain of blocks."""

    def __init__(self) -> None:
        self.chain: List[Block] = [Block.create_genesis()]

    def add_block(self, data: Any) -> Block:
        last_block = self.chain[-1]
        block = Block.create_block(len(self.chain), data, last_block.hash)
        self.chain.append(block)
        return block

    def get_last_block(self) -> Block:
        return self.chain[-1]

    def validate_chain(self) -> bool:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            prev = self.chain[i - 1]
            if current.previous_hash != prev.hash:
                return False
            expected_hash = Block.calculate_hash(
                current.index, current.timestamp, current.data, current.previous_hash
            )
            if current.hash != expected_hash:
                return False
        return True

    def to_json(self) -> str:
        return json.dumps([block.__dict__ for block in self.chain], indent=2)

    @classmethod
    def from_json(cls, data: str) -> "FractalLedger":
        chain_data = json.loads(data)
        ledger = cls()
        ledger.chain = [Block(**b) for b in chain_data]
        return ledger


class Node:
    """Represents a node holding its own ledger and able to sync with peers."""

    def __init__(self, glifo: str, arquetipo: str) -> None:
        self.node_id = str(uuid4())
        self.glifo = glifo
        self.arquetipo = arquetipo
        self.ledger = FractalLedger()

    def register_block(self, data: Any) -> Block:
        return self.ledger.add_block(data)

    def sync_with(self, peer_ledger: FractalLedger) -> None:
        if len(peer_ledger.chain) > len(self.ledger.chain) and peer_ledger.validate_chain():
            self.ledger = deepcopy(peer_ledger)

    def __repr__(self) -> str:  # pragma: no cover - simple representation
        return f"Node({self.node_id[:8]}...)"


if __name__ == "__main__":
    # Basic demonstration with three nodes. Metadata placeholders left for ritual use.
    nodes = [
        Node(glifo="☉", arquetipo="Sol"),
        Node(glifo="☽", arquetipo="Luna"),
        Node(glifo="☿", arquetipo="Mercurio"),
    ]

    # Node 0 adds a block
    nodes[0].register_block({"event": "inicio"})
    # Sync others with node 0
    for n in nodes[1:]:
        n.sync_with(nodes[0].ledger)

    # Node 1 adds another block
    nodes[1].register_block({"transfer": 100})
    # Propagate to node 2
    nodes[2].sync_with(nodes[1].ledger)

    # Validate chains
    for n in nodes:
        print(n.glifo, "valid:", n.ledger.validate_chain())
        print(n.ledger.to_json())

