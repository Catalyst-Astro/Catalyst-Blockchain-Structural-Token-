"""Simple wallet implementation using ECDSA."""

from ecdsa import SigningKey, SECP256k1
from hashlib import sha256


class Wallet:
    """A basic wallet supporting key generation and signing."""

    def __init__(self, signing_key: SigningKey):
        self.signing_key = signing_key
        self.verifying_key = signing_key.get_verifying_key()

    @classmethod
    def generate(cls):
        sk = SigningKey.generate(curve=SECP256k1)
        return cls(sk)

    def address(self) -> str:
        """Return a simple address derived from the public key."""
        vk_bytes = self.verifying_key.to_string()
        return sha256(vk_bytes).hexdigest()

    def sign(self, message: bytes) -> bytes:
        return self.signing_key.sign_deterministic(message, hashfunc=sha256)

    @staticmethod
    def verify(message: bytes, signature: bytes, verifying_key) -> bool:
        try:
            return verifying_key.verify(signature, message, hashfunc=sha256)
        except Exception:
            return False
