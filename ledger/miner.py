"""Simple proof-of-work miner.

This module illustrates a basic adjustable difficulty PoW loop similar
in spirit to Bitcoin's mining process as explained by Antonopoulos.
The mining output demonstrates Stinson's integrity principle where the
resulting nonce ensures the block hash meets the required target.
"""

from __future__ import annotations

from .block import Block


def mine(block: Block, difficulty: int) -> None:
    """Perform proof of work on *block* until its hash satisfies ``difficulty``.

    ``difficulty`` defines the number of leading zeroes required in the
    hexadecimal representation of the block hash.
    """
    target = '0' * difficulty
    while not block.hash.startswith(target):
        block.nonce += 1
        block.hash = block.compute_hash()
