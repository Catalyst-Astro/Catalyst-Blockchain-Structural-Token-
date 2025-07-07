"""Merkle tree utilities used in the simplified blockchain example.

The implementation exposes a small API to compute the Merkle root from a
list of transactions, print the structure and verify inclusion proofs.
The design follows the approach used in Bitcoin, as documented by
Antonopoulos, while providing integrity guarantees in line with
Stinson's description of hash trees.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

from .utils.hashing_tools import sha256_hex


@dataclass
class MerkleTree:
    transactions: List[str]

    def __post_init__(self):
        self._build_tree()

    def _build_tree(self):
        leaves = [sha256_hex(t.encode()) for t in self.transactions]
        self.levels = [leaves]
        while len(leaves) > 1:
            next_level = []
            for i in range(0, len(leaves), 2):
                left = leaves[i]
                right = leaves[i + 1] if i + 1 < len(leaves) else leaves[i]
                combined = sha256_hex((left + right).encode())
                next_level.append(combined)
            leaves = next_level
            self.levels.append(leaves)
        self.root = self.levels[-1][0] if self.levels else ''

    def proof(self, index: int) -> List[Tuple[str, str]]:
        """Return a Merkle proof for the transaction at *index*.

        Each element of the proof is a tuple ``(hash, position)`` where
        ``position`` is ``'left'`` or ``'right'`` indicating where the sibling
        was concatenated during hashing.
        """
        proof = []
        for level in self.levels[:-1]:
            if index % 2 == 0:
                sibling_index = index + 1 if index + 1 < len(level) else index
                position = 'right'
            else:
                sibling_index = index - 1
                position = 'left'
            proof.append((level[sibling_index], position))
            index //= 2
        return proof

    @staticmethod
    def verify_proof(leaf: str, proof: List[Tuple[str, str]], root: str) -> bool:
        """Verify a Merkle proof of inclusion."""
        computed = sha256_hex(leaf.encode())
        for sibling_hash, position in proof:
            if position == 'right':
                computed = sha256_hex((computed + sibling_hash).encode())
            else:
                computed = sha256_hex((sibling_hash + computed).encode())
        return computed == root

    def print_tree(self) -> None:
        """Print the tree levels for debugging purposes."""
        for depth, level in enumerate(self.levels):
            print(f'Level {depth}:')
            for h in level:
                print(f'  {h}')
