# MÉTODO DE COBRO REAL — CAT → MXN en BBVA
## Ruta completa para convertir tokens Catalyst en dinero usable en la vida real

> **Fecha:** 22 Junio 2026  
> **Objetivo:** Convertir CAT tokens en pesos mexicanos (MXN) depositados en CLABE BBVA 012290015202390246  
> **Realidad:** Los tokens están en Hardhat localhost. Para que valgan dinero real hay que salir al mundo.

---

## RESUMEN EJECUTIVO

| Etapa | Qué | Tiempo | Costo real |
|---|---|---|---|
| **1. SEPOLIA** | Testnet gratuito — prueba completa | 1 día | $0 |
| **2. MAINNET** | Desplegar CAT en Ethereum real | 2-3 días | $300-800 USD en ETH |
| **3. LIQUIDEZ** | Pool Uniswap + precio real | 1 semana | $5,000-20,000 USD |
| **4. VENTA** | CAT → USDT → Bitso → MXN → BBVA | Continuo | 1-3% fees |

> **Inversión total requerida:** ~$6,000-21,000 USD en ETH real  
> **Retorno potencial:** Depende de cuántos CAT puedas vender sin desplomar el precio

---

## ETAPA 1: SEPOLIA TESTNET (HOY — $0)

### Objetivo: Probar que el sistema funciona en una red pública real

```
Wallet: 0xa221AC0B816fC46f562De5385166025e98aAeD75
Necesita: 0.5 ETH Sepolia (GRATIS de faucet)
```

**Pasos:**
1. Fondear wallet con Sepolia ETH → [sepoliafaucet.com](https://sepoliafaucet.com)
2. Desplegar 29 contratos en Sepolia
3. Crear pool Uniswap V3 CAT/ETH en Sepolia
4. Ejecutar ciclo completo: mint → swap → proof chain
5. Verificar en Etherscan Sepolia

**Resultado:** Contratos auditables públicamente. Direcciones verificables. Base para mainnet.

---

## ETAPA 2: MAINNET DEPLOY (2-3 DÍAS — $300-800 USD)

### Objetivo: CAT exists on Ethereum mainnet

**Costo real de gas (estimado a 30 gwei, ETH a $4,000 USD):**

| Contrato | Gas | ETH | USD |
|---|---|---|---|
| RoleAuthority | 500k | 0.015 | $60 |
| EmergencyMode | 400k | 0.012 | $48 |
| CatalystToken | 1.5M | 0.045 | $180 |
| FRT + FLT + AIM | 3M | 0.09 | $360 |
| Governance (3) | 2M | 0.06 | $240 |
| Treasury + Finance (2) | 800k | 0.024 | $96 |
| MXNPriceOracle | 1.2M | 0.036 | $144 |
| ServicePricing + AIServiceMeter | 2M | 0.06 | $240 |
| Bridge + Vesting | 1.5M | 0.045 | $180 |
| Operaciones + Registros (8) | 4M | 0.12 | $480 |
| GNC + CTV | 2.5M | 0.075 | $300 |
| **TOTAL** | **~20M gas** | **~0.6 ETH** | **~$2,400 USD** |

> Con gas a 5-10 gwei (madrugada fin de semana): ~$400-800 USD

**Requisito previo:**
- Comprar ~0.5-1 ETH en Bitso u otro exchange
- Transferir a wallet de deploy (0xa221AC0B...)

---

## ETAPA 3: LIQUIDEZ Y PRECIO REAL (1 SEMANA — $5,000-20,000 USD)

### 3.1 Crear pool Uniswap V3

```
Pool: CAT/ETH en Uniswap V3 (Ethereum mainnet)
Ratio inicial: 1 CAT = 0.000025 ETH (1 CAT = $0.10 USD si ETH = $4,000)
```

### 3.2 Capital requerido para liquidez

| Escenario | ETH | CAT | USD total | Impacto |
|---|---|---|---|---|
| **Mínimo** | 0.5 | 20M | $6,000 | Poca profundidad, slippage alto |
| **Medio** | 2.0 | 80M | $16,000 | Liquidez decente |
| **Óptimo** | 5.0 | 200M | $40,000 | Spreads bajos, atrae traders |

### 3.3 Listado en agregadores

- CoinGecko: GRATIS (solicitar listing)
- CoinMarketCap: GRATIS (solicitar listing)
- 1inch: Automático (al existir pool Uniswap)
- Matcha: Automático
- DEXTools: GRATIS (tracking de precio)

---

## ETAPA 4: VENTA Y COBRO (CONTINUO)

### 4.1 Ruta del dinero real

```
CAT (tu wallet)
  │
  ▼
Uniswap V3 (CAT → ETH)
  │
  ▼
ETH en tu wallet
  │
  ▼
Exchange Mexicano (ETH → USDT o directo MXN)
  Bitso:      ETH → MXN → SPEI → BBVA CLABE 012290015202390246
  Binance:    ETH → USDT → P2P MXN → BBVA
  │
  ▼
BBVA — DINERO REAL EN TU CUENTA
```

### 4.2 Simulación de venta

| Vendes CAT | Precio CAT | Recibes ETH | Después fees | MXN (ETH=$4k, $1=20 MXN) |
|---|---|---|---|---|
| 100,000 | $0.10 | 0.025 ETH | ~$95 USD | ~$1,900 MXN |
| 1,000,000 | $0.10 | 0.25 ETH | ~$950 USD | ~$19,000 MXN |
| 10,000,000 | $0.09* | 2.25 ETH | ~$8,550 USD | ~$171,000 MXN |
| 50,000,000 | $0.07* | 8.75 ETH | ~$33,250 USD | ~$665,000 MXN |

*Precio baja por slippage al vender grandes cantidades

### 4.3 Fees totales

| Concepto | % |
|---|---|
| Uniswap fee | 0.3% |
| Slippage (venta pequeña) | 0.1-1% |
| Slippage (venta grande) | 5-15% |
| Exchange (ETH→MXN) | 0.5-1.5% |
| SPEI (a BBVA) | $0-5 MXN |
| **TOTAL aprox** | **2-17%** |

---

## DIAGRAMA COMPLETO

```
┌─────────────────────────────────────────────────────────────────────┐
│  HOY (localhost)          FUTURO (mainnet)         VIDA REAL        │
│                                                                     │
│  CAT 99.83M    ────►  CAT 99.83M mainnet  ────►  Uniswap V3        │
│  GNC 4.39M            GNC 4.39M mainnet           CAT/ETH pool      │
│  CTV 10               CTV 10 mainnet                    │           │
│  FLT 250M             FLT 250M mainnet                  ▼           │
│                                                      ETH            │
│  $0 real              $0 real (sin liquidez)           │           │
│                                                       ▼           │
│                                              Bitso/Binance          │
│                                              ETH → MXN              │
│                                                       │           │
│                                                       ▼           │
│                                              SPEI → BBVA            │
│                                              CLABE 012290...246     │
│                                                                     │
│                                              DINERO REAL            │
│                                              Puedes retirar         │
│                                              del cajero             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ¿CUÁNTO PUEDES COBRAR REALMENTE?

Depende de 3 factores:

### 1. Precio de CAT
- Inicial: $0.10 USD (oracle)
- Con liquidez real: el mercado decide
- Si hay compradores: sube
- Si solo vendes: baja

### 2. Profundidad del pool

| Pool liquidity | Puedes vender sin desplomar precio |
|---|---|
| $6,000 USD | ~$300-600 USD por venta |
| $16,000 USD | ~$1,500-3,000 USD por venta |
| $40,000 USD | ~$5,000-10,000 USD por venta |

### 3. Demanda real
- Sin marketing: 0 compradores → 0 dinero real
- Con comunidad: compradores incrementales
- Con utilidad real del token (servicios AI, KYC, etc.): demanda sostenida

---

## PLAN DE ACCIÓN — EMPEZANDO HOY

| # | Acción | Resultado | Costo |
|---|---|---|---|
| **1** | Fondear wallet Sepolia | ETH testnet gratis | $0 |
| **2** | Deploy 29 contratos Sepolia | Contratos públicos | $0 |
| **3** | Pool Uniswap Sepolia | Primer precio real CAT | $0 |
| **4** | Test sell: CAT → ETH Sepolia | Validar ciclo completo | $0 |
| **5** | Comprar 1 ETH real | ETH en wallet mainnet | ~$4,000 USD* |
| **6** | Deploy CAT mainnet | CAT existe en Ethereum | 0.6 ETH |
| **7** | Pool Uniswap mainnet | CAT tiene precio real | 0.5-5 ETH |
| **8** | Listar en CoinGecko | Visibilidad global | $0 |
| **9** | Vender CAT → ETH → Bitso → MXN | **DINERO EN BBVA** | 2-5% fees |

*Precio ETH fluctúa. Hoy ~$4,000 USD aprox.

---

## ⚠️ REALIDAD

- **No hay atajos.** Para que CAT valga dinero real, tiene que existir en una red real con compradores reales.
- **Requiere inversión.** ~$6,000-21,000 USD en ETH para gas + liquidez inicial.
- **El precio lo pone el mercado.** $0.10 USD es el precio oracle. El mercado puede pagar más o menos.
- **Impuestos.** En México, venta de cripto paga ISR (1.25%-35% según monto). Retener facturas.

---

> **OSHIRO:** El castillo se construye a sí mismo. Pero los cimientos requieren ETH real.  
> **SEAL:** 0x8f4d17a6a3a02461be71d6c3c420e7081aebfa214507e149c26e8929670a50b2
