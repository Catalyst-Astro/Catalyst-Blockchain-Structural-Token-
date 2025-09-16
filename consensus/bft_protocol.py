import logging
from typing import Dict
from catalyst.crypto.signatures import ECDSAKeyPair
from simplechain.blockchain import block_hash

class BFTProtocol:
    """Simplified Byzantine Fault Tolerance protocol."""

    def __init__(self, validators: Dict[str, ECDSAKeyPair]):
        self.validators = validators
        self.logger = logging.getLogger(self.__class__.__name__)

    def sign_block(self, validator_id: str, block) -> bytes:
        kp = self.validators.get(validator_id)
        if kp is None:
            raise ValueError("Unknown validator")
        digest = block_hash(
            block.index,
            block.previous_hash,
            block.timestamp,
            block.transactions,
            block.nonce,
        ).encode()
        sig = kp.sign(digest)
        self.logger.info("Validator %s signed block %s", validator_id, getattr(block, 'index', '?'))
        return sig

    def verify_block(self, block, signatures: Dict[str, bytes]) -> bool:
        digest = block_hash(
            block.index,
            block.previous_hash,
            block.timestamp,
            block.transactions,
            block.nonce,
        ).encode()
        valid_signers = 0
        for vid, sig in signatures.items():
            kp = self.validators.get(vid)
            if kp and kp.verify(sig, digest):
                valid_signers += 1
            else:
                self.logger.warning("Invalid BFT signature from %s", vid)
                return False
        total = len(self.validators)
        required = (2 * total) // 3 + 1
        valid = valid_signers >= required
        self.logger.debug("BFT verify block %s -> %s", getattr(block, 'index', '?'), valid)
        return valid
