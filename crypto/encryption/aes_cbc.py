"""
AES-256 encryption using CBC mode with PKCS7 padding.
AES is recommended in both "Applied Cryptography" and "Serious Cryptography" for symmetric encryption when used with a random IV and secure key management.
"""
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend


BLOCK_SIZE = 128  # AES block size in bits


def encrypt(key: bytes, plaintext: bytes) -> tuple[bytes, bytes]:
    """Encrypt plaintext with AES-256-CBC, returning (iv, ciphertext)."""
    if len(key) != 32:
        raise ValueError("Key must be 32 bytes for AES-256")

    iv = os.urandom(16)
    padder = padding.PKCS7(BLOCK_SIZE).padder()
    padded = padder.update(plaintext) + padder.finalize()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()
    return iv, ciphertext


def decrypt(key: bytes, iv: bytes, ciphertext: bytes) -> bytes:
    """Decrypt ciphertext encrypted with AES-256-CBC."""
    if len(key) != 32:
        raise ValueError("Key must be 32 bytes for AES-256")
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded = decryptor.update(ciphertext) + decryptor.finalize()
    unpadder = padding.PKCS7(BLOCK_SIZE).unpadder()
    plaintext = unpadder.update(padded) + unpadder.finalize()
    return plaintext

