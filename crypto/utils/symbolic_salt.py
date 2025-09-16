"""
Simple utility to create a symbolic salt value as recommended by best practices in cryptographic hashing.
"""
import os


def generate_salt(length: int = 16) -> bytes:
    """Generate random salt value."""
    return os.urandom(length)

