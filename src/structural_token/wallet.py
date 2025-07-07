import os
import json
from typing import List
from ecdsa import SigningKey, NIST256p

class Wallet:
    """Simple ECDSA wallet for signing messages."""

    def __init__(self, private_key: SigningKey | None = None):
        self.private_key = private_key or SigningKey.generate(curve=NIST256p)
        self.public_key = self.private_key.get_verifying_key()

    @classmethod
    def generate(cls):
        return cls(SigningKey.generate(curve=NIST256p))

    def sign(self, message: bytes) -> bytes:
        return self.private_key.sign(message)

    def verify(self, message: bytes, signature: bytes) -> bool:
        try:
            return self.public_key.verify(signature, message)
        except Exception:
            return False

class MultiSigWallet:
    """n-of-m multisignature wallet."""

    def __init__(self, wallets: List[Wallet], threshold: int):
        assert 1 <= threshold <= len(wallets)
        self.wallets = wallets
        self.threshold = threshold

    def sign(self, message: bytes) -> List[bytes]:
        """Collect signatures from all wallets."""
        return [w.sign(message) for w in self.wallets]

    def verify(self, message: bytes, signatures: List[bytes]) -> bool:
        valid = 0
        for w, sig in zip(self.wallets, signatures):
            if w.verify(message, sig):
                valid += 1
        return valid >= self.threshold
