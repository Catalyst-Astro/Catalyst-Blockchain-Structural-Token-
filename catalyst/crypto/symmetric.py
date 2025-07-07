from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import os


class SymmetricCipher:
    """Utility class for AES encryption/decryption using GCM mode."""

    def __init__(self, key: bytes):
        if len(key) not in (16, 24, 32):
            raise ValueError("Invalid AES key size")
        self.key = key

    @staticmethod
    def generate_key(length: int = 32) -> bytes:
        if length not in (16, 24, 32):
            raise ValueError("Invalid key length")
        return os.urandom(length)

    def encrypt(self, plaintext: bytes, associated_data: bytes | None = None) -> tuple[bytes, bytes]:
        nonce = os.urandom(12)
        aesgcm = AESGCM(self.key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)
        return nonce, ciphertext

    def decrypt(self, nonce: bytes, ciphertext: bytes, associated_data: bytes | None = None) -> bytes:
        aesgcm = AESGCM(self.key)
        return aesgcm.decrypt(nonce, ciphertext, associated_data)
