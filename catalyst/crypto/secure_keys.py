"""Secure key generation utilities using RSA and ECC.

This module provides a simple interface to generate RSA and ECC key
pairs with configurable parameters. Keys can be exported in PEM format
and validated for integrity. Implementation uses ``cryptography``,
``ecdsa`` and ``pycryptodome`` libraries, following recommendations from
Stinson and Schneier for sound cryptographic practices.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Tuple

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa
from ecdsa import NIST256p, NIST384p, NIST521p, SigningKey
from Crypto.PublicKey import RSA as CryptoRSA


@dataclass
class RSAKeyPair:
    """Container for an RSA key pair."""

    private_key: rsa.RSAPrivateKey

    @property
    def public_key(self) -> rsa.RSAPublicKey:
        return self.private_key.public_key()

    def export_private_pem(self, password: bytes | None = None) -> bytes:
        """Return the private key in PEM format."""
        encryption = (
            serialization.BestAvailableEncryption(password)
            if password
            else serialization.NoEncryption()
        )
        return self.private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            encryption,
        )

    def export_public_pem(self) -> bytes:
        """Return the public key in PEM format."""
        return self.public_key.public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )


@dataclass
class ECCKeyPair:
    """Container for an ECC key pair."""

    private_key: ec.EllipticCurvePrivateKey

    @property
    def public_key(self) -> ec.EllipticCurvePublicKey:
        return self.private_key.public_key()

    def export_private_pem(self, password: bytes | None = None) -> bytes:
        encryption = (
            serialization.BestAvailableEncryption(password)
            if password
            else serialization.NoEncryption()
        )
        return self.private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            encryption,
        )

    def export_public_pem(self) -> bytes:
        return self.public_key.public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )


def _curve_from_name(name: str) -> Tuple[ec.EllipticCurve, type[SigningKey]]:
    curves = {
        "secp256r1": (ec.SECP256R1(), NIST256p),
        "secp384r1": (ec.SECP384R1(), NIST384p),
        "secp521r1": (ec.SECP521R1(), NIST521p),
    }
    if name.lower() not in curves:
        raise ValueError(f"Unsupported curve: {name}")
    return curves[name.lower()]


def generate_keypair(
    algorithm: str = "rsa", key_size: int = 2048, curve: str = "secp256r1"
) -> RSAKeyPair | ECCKeyPair:
    """Generate an RSA or ECC key pair.

    Parameters
    ----------
    algorithm:
        Either ``"rsa"`` or ``"ecc"``.
    key_size:
        Size of the RSA modulus in bits when ``algorithm='rsa'``.
    curve:
        Name of the elliptic curve when ``algorithm='ecc'``.

    Returns
    -------
    RSAKeyPair | ECCKeyPair
        Generated key container.
    """
    if algorithm.lower() == "rsa":
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
            backend=default_backend(),
        )
        return RSAKeyPair(private_key)

    if algorithm.lower() == "ecc":
        curve_obj, _ = _curve_from_name(curve)
        private_key = ec.generate_private_key(curve_obj, default_backend())
        return ECCKeyPair(private_key)

    raise ValueError("Unsupported algorithm")


def validate_keypair(keypair: RSAKeyPair | ECCKeyPair) -> bool:
    """Perform a basic integrity check on the key pair."""
    if isinstance(keypair, RSAKeyPair):
        message = os.urandom(32)
        ciphertext = keypair.public_key.encrypt(
            message,
            padding.OAEP(
                mgf=padding.MGF1(hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        plaintext = keypair.private_key.decrypt(
            ciphertext,
            padding.OAEP(
                mgf=padding.MGF1(hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        if plaintext != message:
            return False
        # cross-check using pycryptodome
        rsa_key = CryptoRSA.import_key(keypair.export_private_pem())
        return rsa_key.n == keypair.private_key.private_numbers().public_numbers.n

    if isinstance(keypair, ECCKeyPair):
        message = os.urandom(32)
        signature = keypair.private_key.sign(message, ec.ECDSA(hashes.SHA256()))
        try:
            keypair.public_key.verify(signature, message, ec.ECDSA(hashes.SHA256()))
        except Exception:
            return False
        curve_obj, ecdsa_curve = _curve_from_name(keypair.private_key.curve.name)
        sk = SigningKey.from_secret_exponent(
            keypair.private_key.private_numbers().private_value, curve=ecdsa_curve
        )
        vk_bytes = sk.get_verifying_key().to_string()
        pub_bytes = keypair.public_key.public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint,
        )[1:]
        return vk_bytes == pub_bytes

    return False
