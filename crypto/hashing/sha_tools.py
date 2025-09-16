"""
Hashing utilities demonstrating SHA-256 and SHA3-512.
These algorithms are widely used as discussed in Schneier's "Applied Cryptography" and Aumasson's "Serious Cryptography" for integrity checks.
"""
import hashlib


def sha256(data: bytes) -> bytes:
    """Compute SHA-256 digest."""
    hasher = hashlib.sha256()
    hasher.update(data)
    return hasher.digest()


def sha3_512(data: bytes) -> bytes:
    """Compute SHA3-512 digest."""
    hasher = hashlib.sha3_512()
    hasher.update(data)
    return hasher.digest()


def blake2b_hash(data: bytes) -> bytes:
    """Compute Blake2b digest."""
    hasher = hashlib.blake2b()
    hasher.update(data)
    return hasher.digest()

