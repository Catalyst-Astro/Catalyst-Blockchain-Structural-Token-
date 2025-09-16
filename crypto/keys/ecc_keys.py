"""
ECDSA key management using secp256k1.
This follows modern guidance from Aumasson's "Serious Cryptography" on using standardized curves.

References:
- B. Schneier, Applied Cryptography
- J.-P. Aumasson, Serious Cryptography
"""
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend


class ECCKeyPair:
    """ECC secp256k1 key generation and serialization."""

    def __init__(self, private_key: ec.EllipticCurvePrivateKey):
        self.private_key = private_key
        self.public_key = private_key.public_key()

    @classmethod
    def generate(cls) -> 'ECCKeyPair':
        private_key = ec.generate_private_key(ec.SECP256K1(), default_backend())
        return cls(private_key)

    def save_private_key(self, path: str, password: bytes | None = None) -> None:
        encryption_algorithm = (
            serialization.BestAvailableEncryption(password)
            if password
            else serialization.NoEncryption()
        )
        with open(path, 'wb') as f:
            f.write(
                self.private_key.private_bytes(
                    serialization.Encoding.PEM,
                    serialization.PrivateFormat.PKCS8,
                    encryption_algorithm,
                )
            )

    def save_public_key(self, path: str) -> None:
        with open(path, 'wb') as f:
            f.write(
                self.public_key.public_bytes(
                    serialization.Encoding.PEM,
                    serialization.PublicFormat.SubjectPublicKeyInfo,
                )
            )

