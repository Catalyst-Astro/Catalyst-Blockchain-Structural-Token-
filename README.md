# Catalyst Blockchain Structural Token (CBST)

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

Este repositorio no intenta ser un producto terminado. Es un **laboratorio de arquitectura**: piezas pequeñas, legibles y deliberadamente desacopladas que permiten estudiar **cómo** y **por qué** funciona una blockchain.

Pensado para:

- Arquitectos de sistemas distribuidos
- Investigadores en criptografía aplicada
- Diseñadores de gobernanza on‑chain
- Ingenieros que prefieren entender el motor antes de usar el tablero

---

## Qué incluye (actualizado)

### ⛓ Core Blockchain

- Nodos completos P2P sobre TCP y red HTTP auxiliar.
- Nodos SPV y verificación ligera.
- Estructuras de bloque/tx minimalistas con validación y minería simplificada.
- Ledger narrativo y auditor automático de transacciones.

### 🔐 Criptografía aplicada

- Wallets ECDSA y utilidades de hashing.
- Árboles de Merkle y firmas Schnorr.
- Multisig, firmas ciegas y utilidades de cifrado.

### 🧠 Consenso & gobernanza

- Controlador de consenso conmutables: PoW, PoA, BFT y variantes simbólicas.
- Componentes de gobernanza para DAO, auditoría y trazabilidad semántica.

### 📜 Smart Contracts

- Solidity + Hardhat.
- ERC‑20 extendidos, DAO básica, bridges y registries.
- Compatibilidad con OpenZeppelin 5.x.

### 🖥 Interfaces y apps

- API Flask/REST y panel FastAPI (dashboard).
- Dashboard GTK de escritorio.
- Dapp web (`catalyst-dapp`).
- Cliente móvil experimental (React Native + Expo).

---

## Estructura del repositorio

```
auditor/                 Auditoría automática de transacciones
blockchain/              Nodo completo y SPV (sockets TCP)
catalyst/                Bridge e interoperabilidad crypto
catalyst-dapp/           Dapp web experimental
consensus/               Controlador de consenso intercambiable
contracts/               Smart contracts Solidity (ERC‑20, DAO, bridge)
crypto/                  Utilidades criptográficas
dashboard/               UI/Panel de control
docs/                    Documentación extendida
network/                 Red HTTP de pares
narrative_memory/        Ledger narrativo (JSONL)
scripts/                 Scripts de pruebas y testnet
simplechain/             Blockchain mínima expuesta vía HTTP
src/cbst/                Wallet, Merkle, multisig, Schnorr
src/fractalmanagergtk/   Dashboard GTK
src/structural_token/    Identidad y firmas ciegas
api/                     API Flask
app/                     Core FastAPI (dashboard y endpoints)
```

---

## Arranque rápido (Python)

### Requisitos

- Python **3.10+**
- Entorno virtual recomendado

### Instalación

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Tests

```bash
python -m pytest -q
```

---

## Ejemplos de ejecución

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

## Catalyst Blockchain Core (FastAPI)

Dashboard modular y API de estado del core blockchain.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.api.main:app --host 0.0.0.0 --port 8000
```

Abrir:

- http://127.0.0.1:8000/dashboard
- http://127.0.0.1:8000/api/status

### Variables de entorno

- `APP_ENV` (dev/staging/prod)
- `LOG_LEVEL` (INFO/DEBUG)
- `DATA_BACKEND` (memory/sqlite)
- `EVENTS_LIMIT` (default 50)
- `MODULES` (lista separada por comas)

---

## Smart Contracts (Hardhat)

```bash
npm install
npx hardhat compile
```

Contratos clave:

- `CatalystToken.sol`
- `FractalDAO.sol`
- `InflationaryRewardToken.sol`

---

## FractalApp (móvil)

Cliente móvil experimental en **React Native + Expo**.

```bash
cd FractalApp
npm install
npm run start
```

Build APK:

```bash
npx expo build:android -t apk
```

---

## FractalManager (Desktop)

Aplicación de escritorio para gestión de tokens y DAO.

```bash
pyinstaller fractal_manager.py --onefile --noconsole --icon=fractal.ico
```

Variables de entorno (`.env`):

```
PRIVATE_KEY=
RPC_URL=http://localhost:8545
TOKEN_ADDRESS=
DAO_CONTROLLER_ADDRESS=
```

---

## Deploy en Render

1. Push del repo a GitHub.
2. Crear un Render Web Service.
3. Usar `render.yaml` o configurar:
   - Build: `pip install -r requirements.render.txt`
   - Start: `uvicorn app.api.main:app --host 0.0.0.0 --port $PORT`
4. Definir variables de entorno según el entorno.

---

## Contribuciones

- Mantén los módulos pequeños.
- Añade pruebas cuando introduzcas lógica crítica.
- Documenta la intención y las decisiones de diseño.
- No ocultes la complejidad: domestícala.

---

## Licencia

MIT

> *"La seguridad no es un producto. Es un proceso."*
> — espíritu cypherpunk
