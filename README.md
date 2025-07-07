# Catalyst-Blockchain-Structural-Token

This project provides basic cryptographic utilities for symmetric encryption, RSA key management, hashing, and digital signatures using the [cryptography](https://pypi.org/project/cryptography/) library.

## Installation

```bash
pip install -r requirements.txt
```

## Usage Example

```python
from catalyst.crypto.symmetric import SymmetricCipher
from catalyst.crypto.asymmetric import RSAKeyPair
from catalyst.crypto.signatures import ECDSAKeyPair
from catalyst.crypto.hashing import sha256

# Symmetric encryption
key = SymmetricCipher.generate_key()
cipher = SymmetricCipher(key)
nonce, ct = cipher.encrypt(b"secret")
plain = cipher.decrypt(nonce, ct)

# RSA encryption
rsa_kp = RSAKeyPair.generate()
ct = rsa_kp.encrypt(b"message")
plain = rsa_kp.decrypt(ct)

# Signatures
ecdsa_kp = ECDSAKeyPair.generate()
sig = ecdsa_kp.sign(b"msg")
assert ecdsa_kp.verify(sig, b"msg")

# Hashing
h = sha256(b"data")
```

Run tests with `pytest`:

```bash
pytest
```
