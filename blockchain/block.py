import hashlib
import json
import time
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Block:
    index: int
    previous_hash: str
    timestamp: float
    data: str
    nonce: int = 0
    hash: Optional[str] = field(default=None)

    def compute_hash(self) -> str:
        block_string = json.dumps({
            'index': self.index,
            'previous_hash': self.previous_hash,
            'timestamp': self.timestamp,
            'data': self.data,
            'nonce': self.nonce
        }, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    def mine(self, difficulty: int) -> str:
        assert difficulty >= 0
        prefix = '0' * difficulty
        while True:
            self.hash = self.compute_hash()
            if self.hash.startswith(prefix):
                return self.hash
            self.nonce += 1


def create_genesis_block() -> Block:
    block = Block(0, '0', time.time(), 'Genesis')
    block.mine(2)
    return block
