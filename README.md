# Catalyst Blockchain Structural Token

Catalyst Blockchain Structural Token is a modular, educational codebase that showcases the building blocks of a blockchain ecosystem. It combines cryptographic tooling, node and consensus implementations, smart contracts, auditing utilities and narrative ledger examples.

## Features

- **Blockchain layer** – Block structure, proof‑of‑work mining and full/SPV nodes (`blockchain/`).
- **Cryptography & wallets** – RSA/ECC key generation, AES encryption, ECDSA wallet, multisignature operations and Schnorr zero‑knowledge proofs (`crypto/`, `src/cbst/`).
- **Consensus & networking** – Pluggable PoW/PoA/BFT/Symbolic consensus controller (`consensus/`) and a socket‑based P2P network (`network/`).
- **Smart contracts** – Solidity contracts such as `InflationaryRewardToken.sol` demonstrating ERC‑20 extensions (`contracts/`).
- **Auditing & narrative memory** – Transaction auditing utilities (`auditor/`) and a JSONL story ledger (`narrative_memory/`).

## Repository Layout

```
blockchain/           Node implementations and block structures
consensus/            Consensus controller and examples
crypto/               Cryptographic utilities
src/cbst/             Wallet, multisignature and ZKP modules
contracts/            Solidity contracts
auditor/              Automated auditing tools
narrative_memory/     Narrative ledger components
tests/                Pytest-based unit tests
```

## Getting Started

### Requirements
- Python 3.10+
- `pip` for dependency management

### Installation
```bash
pip install -r requirements.txt
```

### Run Tests
```bash
python -m pytest -q
```

## Documentation

See [WORKFLOW.md](WORKFLOW.md) for a development workflow and explore the `docs/` directory for additional guides.

## License

This project is distributed under the [MIT License](LICENSE).

