# Catalyst Blockchain Structural Token

This repository contains example code demonstrating basic wallet functionality, multisignature operations, and identity protection using zero-knowledge proofs. The implementation is educational and references Schneier's cryptographic protocols.

## Layout

- `src/cbst/wallet.py` – simple ECDSA wallet.
- `src/cbst/multisig.py` – demonstration of multisignature transactions.
- `src/cbst/zkp.py` – Schnorr zero-knowledge proof utilities.
- `tests/` – unit tests covering wallet, multisig, and ZKP.

## Running Tests

```bash
pip install -r requirements.txt
pytest
```

## Cryptographic Notes

The zero-knowledge proof in `src/cbst/zkp.py` uses the Schnorr identification protocol. This protocol, described by Bruce Schneier, allows a prover to demonstrate knowledge of a private key without revealing it. The proof is implemented using the Fiat–Shamir heuristic to remove interaction. Multisignature transactions mimic 2-of-3 signing using independent wallets.
