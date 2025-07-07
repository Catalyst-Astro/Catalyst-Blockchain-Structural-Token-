from __future__ import annotations

import hashlib
from typing import Iterable, List


class MerkleTree:
    """Simple Merkle Tree implementation using SHA-256."""

    def __init__(self, leaves: Iterable[bytes | str]):
        self.leaves = [self._to_bytes(leaf) for leaf in leaves] or [b'']
        self.root = self._build_tree(self.leaves)

    @staticmethod
    def _to_bytes(value: bytes | str) -> bytes:
        if isinstance(value, bytes):
            return value
        return str(value).encode('utf-8')

    @staticmethod
    def _hash(value: bytes) -> bytes:
        return hashlib.sha256(value).digest()

    def _build_tree(self, leaves: List[bytes]) -> str:
        level = [self._hash(leaf) for leaf in leaves]
        while len(level) > 1:
            next_level = []
            for i in range(0, len(level), 2):
                left = level[i]
                right = level[i + 1] if i + 1 < len(level) else left
                next_level.append(self._hash(left + right))
            level = next_level
        return level[0].hex()
