
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
=======

# Catalyst Blockchain Structural Token

This repository demonstrates advanced cryptographic features inspired by
Schneier's protocols. The implementation includes:

- Zero-knowledge proof of identity based on the Schnorr protocol.
- Multisignature wallet using ECDSA keys.
- RSA blind signatures for privacy-preserving transactions.

## Usage

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the demo:

```bash
python -m structural_token.main
```
=======

# Catalyst Blockchain Structural Token

Este repositorio contiene un ejemplo sencillo de una arquitectura de nodos para una
red blockchain. Se incluyen nodos completos, nodos ligeros (SPV), funciones de
minado/validación y una topología P2P basada en sockets.

## Estructura

- `blockchain/p2p.py` implementa un nodo P2P genérico.
- `blockchain/block.py` define la estructura de un bloque con un algoritmo de
  *proof of work* muy básico.
- `blockchain/full_node.py` implementa nodos completos que almacenan toda la
  cadena y pueden minar/validar nuevos bloques.
- `blockchain/spv_node.py` implementa nodos ligeros que solo mantienen los
  encabezados de los bloques (SPV).

## Uso rápido

1. Inicie un nodo completo en un terminal:

   ```bash
   python3 -m blockchain.full_node 127.0.0.1 5000
   ```

2. En otro terminal inicie un nodo SPV conectado al nodo completo:

   ```bash
   python3 -m blockchain.spv_node 127.0.0.1 5001 127.0.0.1:5000
   ```

Los nodos se comunican a través de sockets TCP. El nodo completo puede minar
bloques con `mine_block('dato')` desde un intérprete de Python o ampliando el
código para automatizar la minería.
=======
< codex/crear-módulo-emisión-de-token-erc-20/721/1155
=======
odex/crear-módulo-emisión-de-token-erc-20/721/1155
>in
# Catalyst Blockchain Structural Token

Este repositorio contiene un ejemplo sencillo de contrato para la emisión de un token nativo basado en el estándar ERC‑20. El contrato incluye funcionalidades de inflación anual, quema y distribución de recompensas.

## Requisitos

- Node.js 20+
- npm

## Instalación

```bash
npm install
```

## Compilación

```bash
npx hardhat compile
```

El archivo del contrato se encuentra en `contracts/CatalystToken.sol`.
=
=======

<<< codex/construir-interfaz-de-interoperabilidad-con-blockchains
# Catalyst Blockchain Structural Token

Este proyecto provee ejemplos de interoperabilidad entre Ethereum, Bitcoin e IPFS.
Utiliza librerías de código abierto para interactuar con estas redes e incluye
funciones básicas para crear puentes mediante wrapped tokens.

```python
from catalyst.bridge import BlockchainBridge, EthereumConfig, BitcoinConfig

bridge = BlockchainBridge(
    EthereumConfig(provider_url="https://mainnet.infura.io/v3/tu-api-key"),
    BitcoinConfig(rpc_url="http://user:pass@localhost:8332"),
)

eth_balance = bridge.get_eth_balance("0x...")
```
=======
<<dex/crear-módulo-emisión-token-nativo
# Catalyst-Blockchain-Structural-Token-

This repository contains smart contracts for a native token with flexible issuance mechanics. The `InflationaryRewardToken` contract implements the ERC-20 standard while adding optional inflationary minting, token burning and reward distribution capabilities.

## Contracts

- `InflationaryRewardToken.sol` – ERC-20 token with burn functionality, periodic inflation and a reward minting function controlled by an access role.

## Development

Contracts use [OpenZeppelin](https://openzeppelin.com/) libraries. Ensure you install the required dependencies and a Solidity toolchain (for example, [Hardhat](https://hardhat.org/) or [Foundry](https://book.getfoundry.sh/)) before compiling or testing the contracts.

=======
codex/desarrollar-módulo-de-auditoría-automatizada
# Catalyst Blockchain Structural Token

This repository contains example modules for a fictional blockchain project.

## Auditor Module

The `auditor` package provides simple tools to automatically audit contract
transactions. It can detect anomalies such as high value transfers, missing
fields, or invalid signatures. When anomalies are found, a notification is
printed to the console.

### Running Tests

Run the unit tests using Python's built in `unittest` module:

```bash
python -m unittest discover -s tests
```
=======


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





## FractalManager
The `fractal_manager` package contains a basic desktop application for managing
ERC-20 tokens and DAO proposals over an Ethereum compatible network. The GUI is
implemented with `tkinter` and blockchain calls rely on `web3.py`.

### Packaging for Windows
To build a standalone executable use `pyinstaller`:

```bash
pyinstaller fractal_manager.py --onefile --noconsole --icon=fractal.ico
```
Provide your own `fractal.ico` icon (not included).

Create a `.env` file with the following variables so the application can sign
transactions locally:

```
PRIVATE_KEY=
RPC_URL=http://localhost:8545
TOKEN_ADDRESS=
DAO_CONTROLLER_ADDRESS=
```
