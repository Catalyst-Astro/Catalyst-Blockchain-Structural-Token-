# Catalyst Blockchain Structural Token

This repository provides simple scripts to run an Ethereum-compatible blockchain for development.

## Requirements
- `geth` client installed
- `jq` for processing JSON output
- `python3` with `web3` library

Install Python dependencies:
```bash
pip install web3
```

## Local Testnet
Run a private Ethereum node locally:
```bash
./scripts/init_local_testnet.sh
```
This initializes a genesis file and starts a `geth` instance.

## Public Testnet
Connect to the Sepolia public testnet:
```bash
./scripts/init_public_testnet.sh
```

## Validate Node
Check node status via JSON-RPC:
```bash
./scripts/validate_node.sh
```
Set `RPC_URL` if your endpoint differs from `http://localhost:8545`.

## Verify Genesis Block
Print the hash of the genesis block:
```bash
./scripts/verify_genesis.py
```
Again, set `RPC_URL` to your node if necessary.
