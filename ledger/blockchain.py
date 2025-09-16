"""Simplified blockchain for educational purposes.

The implementation mirrors the linked-list structure presented in
Antonopoulos while emphasising integrity verification inspired by
Stinson's framework. Each block references the previous one and is
secured via proof of work and Merkle hashing.
"""

from __future__ import annotations

import time
from typing import List

from .block import Block
from .miner import mine


class Blockchain:
    def __init__(self, difficulty: int = 2):
        self.difficulty = difficulty
        self.chain: List[Block] = [self._create_genesis_block()]

    def _create_genesis_block(self) -> Block:
        return Block(index=0, timestamp=time.time(), data=['Genesis'], previous_hash='0')

    @property
    def last_block(self) -> Block:
        return self.chain[-1]

    def add_block(self, data: List[str]) -> Block:
        block = Block(
            index=len(self.chain),
            timestamp=time.time(),
            data=data,
            previous_hash=self.last_block.hash,
        )
        mine(block, self.difficulty)
        self.chain.append(block)
        return block

    def is_valid(self) -> bool:
        target = '0' * self.difficulty
        for i, block in enumerate(self.chain):
            if block.hash != block.compute_hash():
                return False
            if not block.hash.startswith(target):
                if i == 0:
                    # Genesis block may ignore PoW
                    pass
                else:
                    return False
            if i > 0 and block.previous_hash != self.chain[i - 1].hash:
                return False
            if block.merkle_root != Block(
                block.index,
                block.timestamp,
                block.data,
                block.previous_hash,
                block.nonce,
            ).merkle_root:
                return False
        return True
