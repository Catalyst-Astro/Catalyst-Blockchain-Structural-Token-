import os
from hashlib import sha256
from ecdsa import SigningKey, VerifyingKey, NIST256p
from ecdsa.ellipticcurve import PointJacobi

class Identity:
    """Simple identity with Schnorr-style zero-knowledge proof."""

    def __init__(self, key: SigningKey | None = None):
        self.key = key or SigningKey.generate(curve=NIST256p)
        self.verifying_key = self.key.get_verifying_key()

    @classmethod
    def generate(cls):
        return cls(SigningKey.generate(curve=NIST256p))

    def prove_knowledge(self, message: bytes) -> tuple[bytes, int, int]:
        n = NIST256p.order
        k = int.from_bytes(os.urandom(32), 'big') % n
        R = (k * NIST256p.generator)
        R_bytes = R.to_bytes()
        c = int.from_bytes(sha256(R_bytes + self.verifying_key.to_string() + message).digest(), 'big') % n
        s = (k - c * self.key.privkey.secret_multiplier) % n
        return R_bytes, c, s

    def verify_knowledge(self, message: bytes, proof: tuple[bytes, int, int]) -> bool:
        R_bytes, c, s = proof
        n = NIST256p.order
        try:
            R = PointJacobi.from_bytes(NIST256p.curve, R_bytes)
        except Exception:
            return False
        sG = s * NIST256p.generator
        cY = c * self.verifying_key.pubkey.point
        R_prime = sG + cY
        R_prime_bytes = R_prime.to_bytes()
        c_prime = int.from_bytes(sha256(R_prime_bytes + self.verifying_key.to_string() + message).digest(), 'big') % n
        return c_prime == c
