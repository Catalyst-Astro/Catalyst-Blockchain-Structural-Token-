import logging
from typing import Dict, Any
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.utils import Prehashed
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import hashes as crypto_hashes
from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey
from catalyst.crypto.signatures import ECDSAKeyPair
from simplechain.blockchain import block_hash

class PoAValidator:
    """Symbolic Proof of Authority validator set."""

    def __init__(self, validators: Dict[str, ECDSAKeyPair]):
        self.validators = validators
        self.logger = logging.getLogger(self.__class__.__name__)

    def sign_block(self, validator_id: str, block) -> bytes:
        kp = self.validators.get(validator_id)
        if kp is None:
            raise ValueError("Unknown validator")
        block_digest = block_hash(
            block.index,
            block.previous_hash,
            block.timestamp,
            block.transactions,
            block.nonce,
        ).encode()
        signature = kp.sign(block_digest)
        self.logger.info("Validator %s signed block %s", validator_id, getattr(block, 'index', '?'))
        return signature

    def verify_block(self, block, signatures: Dict[str, bytes]) -> bool:
        block_digest = block_hash(
            block.index,
            block.previous_hash,
            block.timestamp,
            block.transactions,
            block.nonce,
        ).encode()
        for vid, sig in signatures.items():
            kp = self.validators.get(vid)
            if kp is None or not kp.verify(sig, block_digest):
                self.logger.warning("Invalid signature from %s", vid)
                return False
        valid = bool(signatures)
        self.logger.debug("PoA verify block %s -> %s", getattr(block, 'index', '?'), valid)
        return valid
