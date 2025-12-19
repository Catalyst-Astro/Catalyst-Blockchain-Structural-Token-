
# Catalyst Blockchain Structural Token

```
 ██████╗ █████╗ ████████╗ █████╗ ██╗   ██╗██╗     ██╗███████╗████████╗
██╔════╝██╔══██╗╚══██╔══╝██╔══██╗██║   ██║██║     ██║██╔════╝╚══██╔══╝
██║     ███████║   ██║   ███████║██║   ██║██║     ██║███████╗   ██║   
██║     ██╔══██║   ██║   ██╔══██║██║   ██║██║     ██║╚════██║   ██║   
╚██████╗██║  ██║   ██║   ██║  ██║╚██████╔╝███████╗██║███████║   ██║   
 ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝╚══════╝   ╚═╝   
```

> **Catalyst Blockchain Structural Token (CBST)**
> *Sandbox educativo retro‑futurista para diseccionar, comprender y recombinar los componentes fundamentales de una infraestructura blockchain.*

---

## Filosofía

Este repositorio no intenta ser un *producto terminado*. Es un **laboratorio de arquitectura**: piezas pequeñas, legibles y deliberadamente desacopladas que permiten estudiar **cómo** y **por qué** funciona una blockchain.

Nada está escondido detrás de abstracciones innecesarias. Si algo ocurre, se puede rastrear hasta el socket, el hash, la firma o la decisión de consenso que lo originó.

Pensado para:

* Arquitectos de sistemas distribuidos
* Investigadores en criptografía aplicada
* Diseñadores de gobernanza on‑chain
* Ingenieros que prefieren entender el motor antes de usar el tablero

---

## Qué contiene

### ⛓ Blockchain

* Nodos completos por TCP (P2P)
* Nodos SPV (verificación ligera)
* Estructuras de bloque y cadena mínimas
* Minería simplificada y validación

### 🔐 Criptografía

* Wallets (ECDSA / claves asimétricas)
* Árboles de Merkle
* Multisig
* Pruebas de conocimiento cero (Schnorr)
* Firmas ciegas (blind signatures)
* Utilidades de hashing y cifrado

### 🧠 Consenso & Gobernanza

* Controlador de consenso conmutables:

  * PoW
  * PoA
  * BFT
  * Simbólico / narrativo
* Auditor automático de transacciones
* Ledger narrativo para trazabilidad semántica

### 📜 Smart Contracts

* Contratos Solidity (Hardhat)
* ERC‑20 extendidos
* DAO básica
* Bridges y registries

### 🖥 Interfaces

* API Flask / REST
* Dashboard GTK (Adwaita)
* CLI de demostración estructural

---

## Estructura del repositorio

auditor/                 Auditoría automática de transacciones
blockchain/              Nodo completo y SPV (sockets TCP)
catalyst/                Bridge e interoperabilidad crypto
consensus/               Controlador de consenso intercambiable
contracts/               Smart contracts Solidity (ERC‑20, DAO, bridge)
crypto/                  Utilidades criptográficas
narrative_memory/        Ledger narrativo (JSONL)
network/                 Red HTTP de pares
scripts/                 Scripts de pruebas y testnet
simplechain/             Blockchain mínima expuesta vía HTTP
src/cbst/                Wallet, Merkle, multisig, Schnorr
src/structural_token/    Identidad y firmas ciegas
src/fractalmanagergtk/   Dashboard GTK
api/                     API Flask

La documentación extendida vive en `docs/` y las pruebas en `tests/`.

---

## Arranque rápido (Python)

### Requisitos

* Python **3.10+**
* Entorno virtual recomendado

### Instalación

```bash
pip install -r requirements.txt
```

### Tests

```bash
python -m pytest -q
```

---

## Ejemplos

### Nodo completo (P2P por sockets)

```bash
python -m blockchain.full_node 127.0.0.1 5000
```

### Nodo SPV

```bash
python -m blockchain.spv_node 127.0.0.1 5001 127.0.0.1:5000
```

### Demo del Structural Token

```bash
python -m structural_token.main
```

### Auditor automático

```bash
python -m unittest tests.test_audit
```

---

## Smart Contracts

El directorio `contracts/` está configurado para **Hardhat**.

```bash
npm install
npx hardhat compile
```

Contratos clave:

* `CatalystToken.sol`
* `FractalDAO.sol`
* `InflationaryRewardToken.sol`

Basados en **OpenZeppelin 5.x**.

---

## FractalApp (móvil)

Cliente móvil experimental en **React Native + Expo**.

```bash
cd FractalApp
npm install
npx hardhat compile
npm run start
```

Build APK:

```bash
npx expo build:android -t apk
```

---

## FractalManager (Desktop)

Aplicación de escritorio para gestión de tokens y DAO.

   bash
pyinstaller fractal_manager.py --onefile --noconsole --icon=fractal.ico

Variables de entorno (`.env`):

PRIVATE_KEY=
RPC_URL= http: //localhost: 8545
TOKEN_ADDRESS=
DAO_CONTROLLER_ADDRESS=

## Advertencia honesta

Este repositorio **no** es un framework de producción.
Es un **mapa anatómico**.

Si lo usas para aprender, modificar, romper y volver a armar: funciona exactamente como fue diseñado.

## Contribuciones

* Mantén los módulos pequeños
* Añade pruebas
* Documenta la intención
* No ocultes la complejidad: domestícala

## Licencia

MIT

> *"La seguridad no es un producto. Es un proceso."*
> — espíritu cypherpunk

---

# Catalyst Blockchain Core (FastAPI)

This repo includes a modular FastAPI dashboard for Catalyst Blockchain Core.

## Quick start

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```

Open:
- http://127.0.0.1:8000/dashboard
- http://127.0.0.1:8000/api/status

## Environment variables
- `APP_ENV` (dev/staging/prod)
- `LOG_LEVEL` (INFO/DEBUG)
- `DATA_BACKEND` (memory/sqlite)
- `EVENTS_LIMIT` (default 50)
- `MODULES` (comma-separated module list)

## Deploy to Render
1) Push the repo to GitHub.
2) Create a new Render Web Service.
3) Use `render.yaml` or set:
   - Build: `pip install -r requirements.render.txt`
   - Start: `uvicorn app.api.main:app --host 0.0.0.0 --port $PORT`
4) Set env vars as needed.
