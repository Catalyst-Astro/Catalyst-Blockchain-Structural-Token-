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


## FractalApp
A simple mobile client built with React Native and Expo is included in the `FractalApp` directory. It connects to the `FractalToken`, `SymbolicEventLog` and `FractalStaking` smart contracts using `ethers.js`.

### Development
Install dependencies and start Expo:
```bash
cd FractalApp
npm install
npm run start
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

# Catalyst-Blockchain-Structural-Token-

This repository contains smart contracts for a native token with flexible issuance mechanics. The `InflationaryRewardToken` contract implements the ERC-20 standard while adding optional inflationary minting, token burning and reward distribution capabilities.

## Contracts

- `InflationaryRewardToken.sol` – ERC-20 token with burn functionality, periodic inflation and a reward minting function controlled by an access role.
- `FractalAssetToken.sol` – ERC-20 token linked to a validated asset from `FractalLandRegistry`.
- `FractalFundingVault.sol` – Funding contract where participants contribute and later claim tokens.
- `AssetTokenFactory.sol` – Deploys new asset tokens for registry owners.


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

=======
### Build APK
To create an APK ready for testing use Expo's build service:

```bash
npx expo build:android -t apk
```
The generated file will be placed under the `dist` directory.
=======
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

