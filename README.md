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
