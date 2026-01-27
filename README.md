# CATAYST LEDGE — Blockchain estructural para tokenización, trazabilidad y gobernanza (listo para integración empresarial)

[CATAYST LEDGE] es una infraestructura blockchain enfocada en **emitir, administrar y auditar activos digitales** (tokens, credenciales, derechos, rendimientos, trazabilidad) con **arquitectura modular**, gobernanza configurable y herramientas listas para integrarse a sistemas existentes (ERP, CRM, plataformas web, wallets, APIs).

**Propuesta de valor (en una frase):**  
Convertimos procesos críticos (activos, cumplimiento, rendimientos, identidad y trazabilidad) en **flujos verificables**, con reglas programables y evidencia auditable.

> Estado del producto: **Piloto**  
> Licenciamiento: **MIT**  
> Contacto comercial: **[INCUBADORACATALYST@AIL.COM]**

---

¿Por qué existe este producto?
Las organizaciones necesitan:
- **Trazabilidad** y evidencia verificable (auditoría, compliance, reportes).
- **Automatización de reglas** (pagos, rendimientos, acceso, permisos, límites).
- **Gobernanza** (quién aprueba qué, cómo se registra y cómo se audita).
- **Interoperabilidad** (integrarse sin reescribir toda su plataforma).

CATAYST LEDGE se diseñó para ser **una capa de confianza**, no solo “otra cadena”.

---

## Qué resuelve (casos de uso principales)
1) **Tokenización de activos y derechos** – participaciones, derechos de uso, certificados, puntos, licencias, membresías.  
2) **Trazabilidad de procesos y cadenas de custodia** – evidencia de eventos, inspecciones, entregas, mantenimiento, certificaciones.  
3) **Rendimientos y distribución programable** – reglas de reparto, calendarios, límites, aprobaciones y registro auditable.  
4) **Identidad / credenciales verificables** – roles, permisos, acceso por niveles, credenciales y revocación.  
5) **Gobernanza y autorizaciones (DAO/Corp híbrido)** – flujos de aprobación, multi-firma, controles internos, bitácora.

---

## Diferenciadores
- **Arquitectura estructural y modular:** componentes separables (core, emisión, compliance, gobernanza, trazabilidad).
- **Diseñado para auditoría:** logs/eventos, evidencia, trazabilidad por diseño.
- **Gobernanza configurable:** modelos corporativos, comunitarios o híbridos.
- **Integración-first:** pensado para conectarse a productos existentes.
- **Roadmap y paquetes claros:** entregables definidos y verificables.

---

## Qué incluye (alto nivel)
- **Core ledger / contratos / módulos:** emisión y administración de activos digitales.
- **Módulo de gobernanza:** permisos, roles, aprobaciones, bitácora.
- **Módulo de trazabilidad:** eventos verificables, cadena de custodia.
- **Módulo de cumplimiento (opcional):** reglas, listas, límites, control de riesgo.
- **SDK / API (opcional):** integración con apps web, backends, dashboards.
- **Panel GUI (opcional):** administración, monitoreo, reportes y usuarios.

---

## Arquitectura (visión ejecutiva)
**Capa 1 — Core:** reglas del ledger y emisión/gestión de activos  
**Capa 2 — Control:** permisos, gobernanza, compliance, auditoría  
**Capa 3 — Integración:** API/SDK, conectores, panel de administración  
**Capa 4 — Experiencia:** dashboards, flujos, automatización y reportes

---

## Roadmap (orientado a clientes)
- **Fase 1: MVP funcional (0–6 semanas):** emisión/gestión de tokens + bitácora + APIs básicas + demo operativa.  
- **Fase 2: Piloto institucional (6–12 semanas):** roles/permiso, reportes, dashboard, hardening, monitoreo y pruebas.  
- **Fase 3: Producción (12–20 semanas):** seguridad, auditoría externa, escalamiento, redundancia, SLA, documentación.  
- **Fase 4: Expansión (20+ semanas):** conectores, módulos avanzados (KYC/Compliance, identidad, gobernanza híbrida).

---

## Seguridad y confianza
- Separación de privilegios (roles y permisos)  
- Registro de eventos y trazabilidad auditable  
- Pruebas automatizadas (unitarias/integración) según versión  
- Hardening de dependencias y revisión de configuración  
- Auditoría externa: **[planificada / en proceso / completada por …]**

---

## Modelos de entrega
1) **Starter (Demo + MVP):** demo operativa, emisión básica, trazabilidad mínima, documentación de integración.  
2) **Business (Piloto institucional):** roles, dashboard, reportes, pruebas, hardening inicial, soporte.  
3) **Enterprise (Producción + SLA):** auditoría, escalamiento, redundancia, monitoreo, SLA, roadmap conjunto.

---

## Demo rápida (3 minutos)
- Crear un activo/token (mock)  
- Registrar 2–3 eventos de trazabilidad  
- Consultar historial auditable  
- Cambiar estado/permiso con gobernanza  
- Exportar evidencia/reporte (panel)

---

## Integración y GUI
- **Backend/API:** ver `/backend` y `/docs` para endpoints de identidad, eventos, ramp, auditoría.  
- **GUI de administración (Electron + Vite + React):** ubicada en `apps/catalyst-gui`.  
  - Instalar: `cd apps/catalyst-gui && npm install`  
  - Dev (abre ventana Electron): `npm run dev`  
  - Build: `npm run build`
- **Hardhat / contratos:** en la raíz (`npm install`, `npm test`, `npx hardhat compile`).

## Filosofía

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

```plaintext
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

- [http://127.0.0.1:8000/dashboard](http://127.0.0.1:8000/dashboard)
- [http://127.0.0.1:8000/api/status](http://127.0.0.1:8000/api/status)

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

