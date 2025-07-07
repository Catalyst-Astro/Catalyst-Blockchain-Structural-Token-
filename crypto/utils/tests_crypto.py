"""
Unit tests to validate cryptographic primitives.
Following best practices from "Applied Cryptography" to test for correct implementation and from "Serious Cryptography" to ensure interoperability.
"""
import unittest
from crypto.keys.rsa_keys import RSAKeyPair
from crypto.keys.ecc_keys import ECCKeyPair
from crypto.encryption.aes_cbc import encrypt, decrypt
from crypto.hashing.sha_tools import sha256, sha3_512
import os


class CryptoTests(unittest.TestCase):
    def test_rsa_sign_verify(self):
        keypair = RSAKeyPair.generate()
        message = b"test message"
        signature = keypair.sign(message)
        # Verify does not raise
        keypair.verify(signature, message)

    def test_ecc_generate(self):
        keypair = ECCKeyPair.generate()
        self.assertIsNotNone(keypair.private_key)
        self.assertIsNotNone(keypair.public_key)

    def test_aes_encrypt_decrypt(self):
        key = os.urandom(32)
        message = b"secret data"
        iv, ct = encrypt(key, message)
        pt = decrypt(key, iv, ct)
        self.assertEqual(pt, message)

    def test_hashes(self):
        data = b"hash me"
        self.assertEqual(len(sha256(data)), 32)
        self.assertEqual(len(sha3_512(data)), 64)


if __name__ == "__main__":
    unittest.main()

