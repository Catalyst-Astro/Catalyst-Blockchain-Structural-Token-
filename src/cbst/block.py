from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Any
import hashlib
import json
from .merkle import MerkleTree


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass
class Block:
    index: int
    transactions: List[Any]
    previous_hash: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    merkle_root: str = field(init=False)
    hash: str = field(init=False)

    def __post_init__(self):
        self.merkle_root = MerkleTree(self.transactions).root
        self.hash = self.compute_hash()

    def compute_hash(self) -> str:
        block_data = {
            'index': self.index,
            'timestamp': self.timestamp.isoformat(),
            'transactions': self.transactions,
            'previous_hash': self.previous_hash,
            'merkle_root': self.merkle_root,
        }
        json_str = json.dumps(block_data, sort_keys=True)
        return sha256(json_str.encode('utf-8'))
