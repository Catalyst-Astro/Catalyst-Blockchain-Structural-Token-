"""Modular key generation utilities for RSA and ECC.

This module implements a class :class:`FractalKeygen` that can generate
cryptographic key pairs following modern security principles described in
Stinson ("Cryptography: Theory and Practice") and Schneier ("Applied
Cryptography"). It provides functions to export keys and validate that the
private and public parts form a valid pair. The module relies only on
``cryptography``, ``ecdsa`` and ``pycryptodome`` libraries.
"""

from __future__ import annotations

from typing import Tuple

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from ecdsa import SigningKey, VerifyingKey, NIST256p, NIST384p, NIST521p, SECP256k1
from Crypto.Random import get_random_bytes


class FractalKeygen:
    """Generate, export and validate RSA or ECC key pairs."""

    RSA_DEFAULT_BITS = 4096
    ECC_DEFAULT_CURVE = "secp256r1"

    _ECC_CURVES = {
        "secp256r1": NIST256p,
        "secp384r1": NIST384p,
        "secp521r1": NIST521p,
        "secp256k1": SECP256k1,
    }

    def generate_keypair(
        self,
        algorithm: str = "RSA",
        key_size: int = RSA_DEFAULT_BITS,
        curve: str = ECC_DEFAULT_CURVE,
    ) -> Tuple[object, object]:
        """Generate a private/public key pair.

        Parameters
        ----------
        algorithm:
            ``"RSA"`` or ``"ECC"``.
        key_size:
            RSA modulus size in bits. Ignored for ECC.
        curve:
            Name of the elliptic curve. Used when ``algorithm`` is ``"ECC"``.

        Returns
        -------
        Tuple[object, object]
            The private key and corresponding public key.
        """
        algo = algorithm.upper()
        if algo == "RSA":
            private = rsa.generate_private_key(
                public_exponent=65537,
                key_size=key_size,
                backend=default_backend(),
            )
            return private, private.public_key()
        if algo == "ECC":
            curve_cls = self._ECC_CURVES.get(curve.lower())
            if not curve_cls:
                raise ValueError(f"Unsupported curve: {curve}")
            sk = SigningKey.generate(curve=curve_cls)
            return sk, sk.get_verifying_key()
        raise ValueError("Unsupported algorithm. Use 'RSA' or 'ECC'.")

    @staticmethod
    def export_private_key(private_key: object, path: str) -> None:
        """Write a private key to a PEM file."""
        if hasattr(private_key, "private_bytes"):
            pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            )
        else:
            pem = private_key.to_pem()
        with open(path, "wb") as f:
            f.write(pem)

    @staticmethod
    def export_public_key(public_key: object, path: str) -> None:
        """Write a public key to a PEM file."""
        if hasattr(public_key, "public_bytes"):
            pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo,
            )
        else:
            pem = public_key.to_pem()
        with open(path, "wb") as f:
            f.write(pem)

    @staticmethod
    def validate_pair(private_key: object, public_key: object) -> bool:
        """Check private/public key integrity by signing and verifying."""
        message = get_random_bytes(32)
        if hasattr(private_key, "sign") and not hasattr(private_key, "decrypt"):
            # Assume ECDSA key pair from ecdsa library
            signature = private_key.sign_deterministic(message, hashfunc=__import__("hashlib").sha256)
            try:
                return public_key.verify(signature, message, hashfunc=__import__("hashlib").sha256)
            except Exception:
                return False
        if isinstance(private_key, rsa.RSAPrivateKey):
            signature = private_key.sign(
                message,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH,
                ),
                hashes.SHA256(),
            )
            try:
                public_key.verify(
                    signature,
                    message,
                    padding.PSS(
                        mgf=padding.MGF1(hashes.SHA256()),
                        salt_length=padding.PSS.MAX_LENGTH,
                    ),
                    hashes.SHA256(),
                )
                return True
            except Exception:
                return False
        raise ValueError("Unsupported key type for validation.")
