"""
Utility functions for RSA key generation and signing.
Follows principles discussed in Schneier's 'Applied Cryptography' about using well-vetted libraries and strong randomness.

References:
- B. Schneier, Applied Cryptography
- J.-P. Aumasson, Serious Cryptography
"""
import os
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import utils


class RSAKeyPair:
    """Utility for RSA key generation, signing and verification."""

    def __init__(self, private_key: rsa.RSAPrivateKey):
        self.private_key = private_key
        self.public_key = private_key.public_key()

    @classmethod
    def generate(cls, key_size: int = 2048) -> 'RSAKeyPair':
        """Generate a RSA private/public key pair."""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
            backend=default_backend(),
        )
        return cls(private_key)

    def save_private_key(self, path: str, password: bytes | None = None) -> None:
        """Save the private key to a PEM file."""
        encryption_algorithm = (
            serialization.BestAvailableEncryption(password)
            if password
            else serialization.NoEncryption()
        )
        with open(path, 'wb') as f:
            f.write(
                self.private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=encryption_algorithm,
                )
            )

    def save_public_key(self, path: str) -> None:
        """Save the public key to a PEM file."""
        with open(path, 'wb') as f:
            f.write(
                self.public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo,
                )
            )

    def sign(self, data: bytes) -> bytes:
        """Sign data using RSA-PSS as recommended in Serious Cryptography."""
        signature = self.private_key.sign(
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )
        return signature

    def verify(self, signature: bytes, data: bytes) -> None:
        """Verify a RSA-PSS signature."""
        self.public_key.verify(
            signature,
            data,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH,
            ),
            hashes.SHA256(),
        )

