# Development Workflow

This document outlines a recommended workflow for working with the Catalyst Blockchain Structural Token project.

## 1. Prepare the Environment

### Clone and Install
```bash
git clone <repository-url>
cd Catalyst-Blockchain-Structural-Token-
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Optional Tooling
- Node.js and npm for Hardhat-related smart contract tasks.
- Geth and `jq` for the Ethereum scripts in `scripts/`.

## 2. Run Unit Tests

```bash
python -m pytest -q
```

## 3. Experiment with the Blockchain Layer

- Start a full node:
  ```bash
  python -m blockchain.full_node 127.0.0.1 5000
  ```
- Launch additional nodes or SPV nodes as required.

## 4. Explore Cryptographic Modules

- Generate keys and run wallet demonstrations:
  ```bash
  python src/cbst/wallet.py
  ```
- Try multisignature and zero-knowledge proof examples in `src/cbst/`.

## 5. Deploy Smart Contracts

- Ensure Hardhat is installed and compile the contracts:
  ```bash
  npx hardhat compile
  ```
- Deploy `InflationaryRewardToken.sol` to a local or public network and interact via Hardhat scripts.

## 6. Auditing and Narrative Memory

- Run automated audit tools from the `auditor/` package.
- Append events to the narrative ledger:
  ```bash
  python narrative_memory/story_ledger.py "Actor" "Action description"
  ```

## 7. Contributing

1. Format and document your changes.
2. Add or update tests.
3. Run the complete test suite.
4. Open a pull request describing the modifications and their rationale.

