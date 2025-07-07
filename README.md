# Catalyst Blockchain Structural Token - Crypto Module

This repository contains a small cryptographic toolkit implemented in Python. The code demonstrates key generation, encryption, hashing and digital signatures using the `cryptography` library.

## Structure
```
crypto/
  keys/
    rsa_keys.py       # RSA 2048-bit key generation, signing
    ecc_keys.py       # secp256k1 ECC key generation
  encryption/
    aes_cbc.py        # AES-256 CBC encryption/decryption
  hashing/
    sha_tools.py      # SHA-256, SHA3-512, Blake2b hashes
  utils/
    tests_crypto.py   # Unit tests
    symbolic_salt.py  # Salt generation helper
```

## Running the tests
Install dependencies and execute the unit tests:

```bash
pip install cryptography ecdsa
python3 -m unittest crypto.utils.tests_crypto
```

The tests verify correct encryption/decryption, signature verification and hash output sizes.
