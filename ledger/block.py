"""Basic block representation for the example blockchain.

Fields mirror the generic structure described by Antonopoulos while the
integrity considerations follow Stinson's model. A block keeps an index,
a timestamp, a list of transactions, a link to the previous block and
values used in proof of work.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Any
import time

from .utils.hashing_tools import sha256_hex
from .merkle_tree import MerkleTree


@dataclass
class Block:
    index: int
    timestamp: float
    data: List[str]
    previous_hash: str
    nonce: int = 0
    hash: str = field(init=False)
    merkle_root: str = field(init=False)

    def __post_init__(self):
        self.merkle_root = MerkleTree(self.data).root
        self.hash = self.compute_hash()

    def compute_hash(self) -> str:
        """Return the SHA-256 hash of the block header."""
        header = (
            f"{self.index}{self.timestamp}{self.merkle_root}" f"{self.previous_hash}{self.nonce}"
        ).encode()
        return sha256_hex(header)
