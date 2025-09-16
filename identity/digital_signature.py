"""Digital signature utilities using RSA and ECC.

This module demonstrates practical cryptographic constructions
while keeping the formal security considerations found in
Stinson (2006), Schneier (1996) and Boneh-Shoup (2020).
"""

from hashlib import sha256
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa, padding
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature
from ecdsa import SigningKey, SECP256k1


class RSAIdentity:
    """Identity using RSA keys for digital signatures."""

    def __init__(self, private_key: rsa.RSAPrivateKey):
        self.private_key = private_key
        self.public_key = private_key.public_key()

    @classmethod
    def generate(cls, key_size: int = 2048) -> "RSAIdentity":
        pk = rsa.generate_private_key(public_exponent=65537, key_size=key_size, backend=default_backend())
        return cls(pk)

    def sign(self, data: bytes) -> bytes:
        return self.private_key.sign(
            data,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
            hashes.SHA256(),
        )

    def verify(self, signature: bytes, data: bytes) -> bool:
        try:
            self.public_key.verify(
                signature,
                data,
                padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH),
                hashes.SHA256(),
            )
            return True
        except Exception:
            return False


class ECCIdentity:
    """Identity using elliptic curve keys (SECP256k1)."""

    def __init__(self, signing_key: SigningKey):
        self.signing_key = signing_key
        self.verifying_key = signing_key.get_verifying_key()

    @classmethod
    def generate(cls) -> "ECCIdentity":
        return cls(SigningKey.generate(curve=SECP256k1))

    def sign(self, data: bytes) -> bytes:
        return self.signing_key.sign_deterministic(data, hashfunc=sha256)

    def verify(self, signature: bytes, data: bytes) -> bool:
        try:
            return self.verifying_key.verify(signature, data, hashfunc=sha256)
        except Exception:
            return False
