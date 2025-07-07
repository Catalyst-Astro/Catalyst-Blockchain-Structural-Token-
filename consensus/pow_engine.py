import logging
from simplechain.blockchain import block_hash

class PoWEngine:
    """Proof of Work engine using SHA-256."""

    def __init__(self, difficulty: int = 4):
        self.difficulty = difficulty
        self.logger = logging.getLogger(self.__class__.__name__)

    def mine(self, block) -> str:
        """Perform PoW mining on a block, mutating its nonce until valid."""
        self.logger.info("Mining block %s", getattr(block, 'index', '?'))
        prefix = '0' * self.difficulty
        while True:
            block.hash = block_hash(
                block.index,
                block.previous_hash,
                block.timestamp,
                block.transactions,
                block.nonce,
            )
            if block.hash.startswith(prefix):
                self.logger.info("Block mined with nonce %s", block.nonce)
                return block.hash
            block.nonce += 1

    def verify(self, block) -> bool:
        """Verify PoW for a block."""
        expected = block_hash(
            block.index,
            block.previous_hash,
            block.timestamp,
            block.transactions,
            block.nonce,
        )
        valid = expected == block.hash and block.hash.startswith('0' * self.difficulty)
        self.logger.debug("Verify block %s PoW -> %s", getattr(block, 'index', '?'), valid)
        return valid
