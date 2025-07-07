

ntar-sistema-de-memoria-narrativa
# Catalyst-Blockchain-Structural-Token

Este repositorio contiene ejemplos simples para demostrar conceptos de almacenamiento en libro mayor.

## Narrativa del Libro Mayor

Se ha implementado un sistema de **memoria narrativa** donde cada acción relevante se registra como historia dentro del libro mayor. Para agregar una nueva entrada puede utilizarse el script `story_ledger.py`.

### Uso

```bash
python narrative_memory/story_ledger.py "Actor" "Descripción de la acción"
```

Cada invocación añadirá un registro en `narrative_ledger.jsonl` con la fecha, el actor y la descripción de la acción.
=======
x/desplegar-blockchain-en-red-local-y-testnet
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

