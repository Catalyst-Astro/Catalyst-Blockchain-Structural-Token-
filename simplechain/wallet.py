import os
from ecdsa import SigningKey, SECP256k1
import hashlib

class Wallet:
    """Simple wallet using ECDSA keys."""

    def __init__(self, private_key=None):
        if private_key is None:
            self._sk = SigningKey.generate(curve=SECP256k1)
        else:
            self._sk = SigningKey.from_string(bytes.fromhex(private_key), curve=SECP256k1)
        self._vk = self._sk.get_verifying_key()

    @property
    def private_key(self):
        return self._sk.to_string().hex()

    @property
    def public_key(self):
        return self._vk.to_string().hex()

    def address(self):
        pk_bytes = self._vk.to_string()
        sha = hashlib.sha256(pk_bytes).digest()
        ripemd = hashlib.new('ripemd160', sha).digest()
        return ripemd.hex()

    def sign(self, message: bytes) -> str:
        return self._sk.sign_deterministic(message, hashfunc=hashlib.sha256).hex()
