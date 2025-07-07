esarrollar-api-restful-para-wallets-y-nodos
# Catalyst Blockchain Structural Token

This repository contains a simple RESTful API to integrate wallets, nodes, and blockchain explorers with external platforms. The API is built with Python and Flask.

See [api/README.md](api/README.md) for setup and usage instructions.
=======
 codex/entrenar-a-codex-para-gestionar-blockchain
# Catalyst-Blockchain-Structural-Token

Repositorio inicial para experimentos sobre una blockchain basada en tokens estructurales.

Consulta [BLOCKCHAIN_PROMPTS.md](./BLOCKCHAIN_PROMPTS.md) para ejemplos de prompts destinados a entrenar o guiar a Codex en tareas de mantenimiento, escalado y adaptación de la red.
=======


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
=======
# Catalyst Blockchain Structural Token

This repository provides a minimal blockchain prototype inspired by Bitcoin.
It demonstrates a simple peer-to-peer architecture, proof-of-work consensus,
and ECDSA-based wallets as described by Antonopoulos and Schneier.

## Features
- Peer discovery and basic HTTP communication between nodes
- Transactions signed with ECDSA (secp256k1)
- Mining blocks using a configurable difficulty
- Verification of the entire chain

## Usage
Install dependencies and run a node on a specific port:

```bash
pip install -r requirements.txt
python -m simplechain.node 8000
```

Send transactions and mine blocks via HTTP requests:

```bash
curl -X POST http://localhost:8000/transactions/new \
  -d '{"sender": "<pubkey>", "recipient": "<address>", "amount": 1, "signature": "<sig>"}'
curl -X POST http://localhost:8000/mine
```

View the current chain:

```bash
curl http://localhost:8000/chain

```

