"""Hashing utilities for the ledger package.

Implements SHA-256 and SHA3-512 helpers. The functions return
hexadecimal digests to ease string comparisons. Documentation
references the integrity properties described by Stinson and the
hashing mechanisms used in Bitcoin as explained by Antonopoulos.
"""

from __future__ import annotations

import hashlib


def sha256(data: bytes) -> str:
    """Return the SHA-256 hex digest of *data*."""
    return hashlib.sha256(data).hexdigest()


def sha3_512(data: bytes) -> str:
    """Return the SHA3-512 hex digest of *data*."""
    return hashlib.sha3_512(data).hexdigest()


# Aliases used by other modules
sha256_hex = sha256
sha3_512_hex = sha3_512
