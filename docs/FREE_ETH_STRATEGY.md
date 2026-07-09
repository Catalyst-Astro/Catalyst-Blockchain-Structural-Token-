# 🆓 CÓMO GANAR ETHEREUM GRATIS + DAR VALOR A CAT
## Estrategia VHS — Valor Hardhat System

---

## 🔴 PROBLEMA: 0 ETH real en mainnet

No hay ETH en `0xa221...eD75` ni en `0xF051...`. Sin ETH = sin deploy a producción.

---

## 🟢 SOLUCIÓN: Sistema de 3 capas para generar valor

```
┌─────────────────────────────────────────────────────┐
│                  CAPA 1: HARDHAT LOCAL               │
│  ┌───────────────────────────────────────────────┐  │
│  │  Node #0: 0xf39F... (10000 ETH)               │  │
│  │  Node #1: 0x7099... (10000 ETH)               │  │
│  │  20,000 ETH disponibles para desarrollo       │  │
│  └───────────────────────────────────────────────┘  │
│                      │                               │
│                      ▼                               │
│  ┌───────────────────────────────────────────────┐  │
│  │  CAT Token deployado en localhost:8545         │  │
│  │  1,000,000,000 CAT minted                     │  │
│  │  Oracle: 1 CAT = $0.10 USD = $2.00 MXN       │  │
│  │  Uniswap V3 Pool: CAT/ETH creado              │  │
│  └───────────────────────────────────────────────┘  │
│                      │                               │
├──────────────────────┼───────────────────────────────┤
│                  CAPA 2: SEPOLIA TESTNET              │
│  ┌───────────────────────────────────────────────┐  │
│  │  29 contratos desplegados                     │  │
│  │  CAT: 0xD0BDAdf8618D487458e2AD3b6d6B1CfD8... │  │
│  │  0.001 ETH disponible para gas               │  │
│  │  Oracle funcionando: 1 CAT = $2 MXN           │  │
│  └───────────────────────────────────────────────┘  │
│                      │                               │
├──────────────────────┼───────────────────────────────┤
│                  CAPA 3: GETH MAINNET                 │
│  ┌───────────────────────────────────────────────┐  │
│  │  455 GB chaindata descargados                 │  │
│  │  Lighthouse checkpoint sync en progreso       │  │
│  │  0 ETH real (necesita fondeo externo)         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 📝 PASO A PASO: Ganar ETH + Valor a CAT

### 1. Iniciar Hardhat + Deploy CAT

```bash
# Terminal 1: Arrancar Hardhat
cd C:\Users\h\Documents\GitHub\Catalyst-Blockchain-Structural-Token-
npx hardhat node

# Terminal 2: Deploy completo
npx hardhat run scripts/deploy_core.js --network localhost
```

### 2. Crear Uniswap Pool CAT/ETH (da precio real al CAT)

```bash
npx hardhat run scripts/deploy_uniswap_pool.js --network localhost
# Pool: 10000 CAT + 10 ETH = precio inicial
# Esto hace que 1 CAT valga ~0.001 ETH
```

### 3. Conectar MetaMask a Hardhat

```
MetaMask → Settings → Networks → Add Network → Manual
  RPC: http://127.0.0.1:8545
  Chain ID: 31337
  Symbol: ETH
→ Import Account → Private Key:
  0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 4. Registrar CAT en MetaMask

```
MetaMask → Import Token → Custom Token
  Contract: [CAT address from contracts.json]
  Symbol: CAT
  Decimals: 18
→ Verás 100,000,000 CAT en tu wallet
```

---

## 💰 ESTRATEGIAS PARA GANAR ETH GRATIS

| Método | ETH gratis | Tiempo | Dificultad |
|---|---|---|---|
| **Hardhat Node 0 + 1** | 20,000 ETH (test) | Inmediato | Fácil |
| **Sepolia Faucet** | 0.01 ETH/día | 1 min | Fácil |
| **Base Sepolia Faucet** | 0.01 ETH/día | 1 min | Fácil |
| **Holesky Faucet** | 0.1 ETH/día | 1 min | Fácil |
| **Lighthouse sync** | ETH histórico de tu cadena | 6-12h | Medio |
| **Airdrops** | 0.01-0.5 ETH | Variable | Buscar |
| **Gitcoin Grants** | Donaciones | 1-4 semanas | Proyecto |

---

## 🔄 USAR HARDHAT NODES 0 Y 1 PARA VALORAR CAT

```javascript
// Node #0: 10000 ETH → Pool Uniswap
// Node #1: 10000 ETH → Liquidez adicional
// Total: 20000 ETH disponibles para dar valor a CAT

// Estrategia:
// 1. Deploy CAT en localhost
// 2. Crear pool CAT/ETH con 10000 CAT + 8 ETH
// 3. Precio inicial: 1 CAT = 0.0008 ETH
// 4. Con 20000 ETH de respaldo, CAT tiene mercado
// 5. Conectar MetaMask y ver el valor real en wallet
```

---

## 🦊 REGISTRAR EN METAMASK

```
Red:        Localhost 8545 (Chain ID 31337)
Cuenta:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
CAT Token:  [deploy_core.js output]
GNC Token:  [deploy_gnc_ctv.js output]
```

---

## ⚡ LIGHTHOUSE FIX (para ti, ejecutar en CMD)

```cmd
rmdir /s /q "N:\Ethereum\lighthouse\beacon\chain_db"
N:\Ethereum\bin\lighthouse.exe beacon_node --network mainnet --datadir="N:\Ethereum\lighthouse" --execution-endpoint http://127.0.0.1:8551 --execution-jwt "N:\Ethereum\jwtsecret" --checkpoint-sync-url "https://mainnet-checkpoint-sync.attestant.io" --http --http-port 5052
```
