# ◆ Catalyst Bank — Sistema Bancario Autopoiético con Tokenomics Elástica

[![BELL License](https://img.shields.io/badge/license-BELL%2013450.50-gold)](docs/BELL_LICENSE_13450.50.md) [![Apache 2.0](https://img.shields.io/badge/code-Apache%202.0-blue)](LICENSE)
[![Solidity](https://img.shields.io/badge/solidity-^0.8.20-lightgrey)](contracts/)
[![Python](https://img.shields.io/badge/python-3.10+-blue)](Eincode/arke/)
[![BELL](https://img.shields.io/badge/BELL-13450.50-brightgreen)](docs/)
[![Mainnet](https://img.shields.io/badge/Base%20Mainnet-ready-0052FF)](scripts/deploy_base_minimal.js)
[![Banxico](https://img.shields.io/badge/Banxico%20API-live-green)](Eincode/arke/banxico_oracle.py)

**Catalyst Bank** es el primer sistema bancario autopoiético del mundo. Procesa pagos transfronterizos China→México a través del gateway UnionPay QR (`qr.95516.com`), convierte CNY a tokens CAT con valor real en pesos mexicanos (vía Banxico DOF FIX), y liquida en cualquier CLABE mexicana a través de SPEI — todo en menos de 6 minutos.

> **Autopoiesis económica:** El supply de tokens NO es fijo. Crece con la actividad económica real. Cada quema de CAT (5%) habilita expansión futura. Lo contrario a la entropía: el sistema se auto-crea.

---

## 🎯 ¿Qué hace Catalyst Bank?

```
QR UnionPay (China)  →  COBOL ANSI-85  →  CAT Token (Base L2)  →  Uniswap V3  →  USDC  →  Bitso  →  SPEI  →  BBVA (México)
    ¥855B CNY              88-LEVEL           Elastic Supply          DEX           Stable    IFPE      CLABE 012290015202390246
```

1. **Recibe pagos QR** desde China (`qr.95516.com`) mediante triggers binarios de 278 a 1855 bits
2. **Procesa en COBOL ANSI-85** con 88-LEVEL conditions y partida doble NIF (86 cuentas)
3. **Convierte a CAT tokens** usando el Oracle 4-Pillar (CAT/USD + USD/MXN + USD/CNY + CAT/MXN)
4. **Valoriza en MXN real** vía Banxico API (DOF FIX serie SF43718) — tipo de cambio oficial del Diario Oficial de la Federación
5. **Liquida en BBVA** a través de SPEI vía Bitso Business (NVIO Pagos, IFPE autorizada por CNBV)

**Tiempo total: 6 minutos.** Del QR en China al peso en tu cuenta BBVA.

---

## 📊 Tokenomics Elástica (ERC-26+)

Catalyst supera el estándar ERC-20 con **supply elástico autopoiético**: sin `MAX_SUPPLY` fijo. El supply crece con la economía real, no con especulación.

| Token | Red | Supply | Valor MXN (Banxico DOF) | Respaldo |
|---|---|---|---|---|
| **CAT** | Base L2 | **ELÁSTICO** (~1.24T cap) | **$1.6544 MXN** | CNY procesado + Burn expansion |
| **GNC** | Base L2 | **ELÁSTICO** (~18T+ cap) | **$2.4105 MXN** | 1:1 CNY (cada CNY procesado = 1 GNC) |
| **CTV** | Base L2 | **ELÁSTICO** (~18B+ cap) | **$2,410.46 MXN** | GNC bridge (1 CTV = 1,000 GNC) |
| **AIM** | Base L2 | **ELÁSTICO** (~1B+ cap) | **$0.1748 MXN** | AI compute ($0.01 USD/AIM) |
| **FRT** | Ethereum | Owner mint | N/A | Compliance / Reward |
| **FLT** | Ethereum | Owner mint | N/A | Fractal governance |

### Fórmula de expansión elástica

```
CAT:  elasticCap = 1B floor + (CNY_procesado × 1.457) + (CAT_quemado × 0.05)
GNC:  elasticCap = 1M floor + totalCnyBacked × 1.2
CTV:  elasticCap = 18B floor + GNC_cap / 1000
AIM:  elasticCap = 1B floor + totalAIBurned × 1.5
```

**Principio fundamental:** Cada quema de CAT (5% por transacción) **habilita** expansión futura. La destrucción controlada genera capacidad de creación. Autopoiesis = el sistema se auto-crea.

---

## 🏦 Infraestructura Bancaria

### 21 Triggers Binarios Procesados

| Tipo | Cantidad | CNY Total | MXN Equivalente |
|---|---|---|---|
| Triggers Maestros (QR-001 a Composite 1855-bit) | 8 | ¥563,211,000,000 | $1,553,462,360,000 |
| QR Binarios 13-Cuentas (512-bit) | 13 | ¥971,598,000 | $2,626,660,388 |
| **TOTAL** | **21** | **¥855,986,554,770** | **$2,360,991,439,223** |

### 13 Protocolos Bancarios (P01-P13)

| # | Protocolo | Estado |
|---|---|---|
| P01 | Registro de Institución Financiera | ✅ On-Chain |
| P02 | Onboarding KYC/AML | ✅ IdentitySBT |
| P03 | Pago QR Transfronterizo (CN→MX) | ✅ 7 TX reales |
| P04 | Conversión Multidivisa (Oracle 4-Pillar) | ✅ Banxico API |
| P05 | Transferencia SWIFT Internacional | ⚠️ MT103 generados |
| P06 | Gestión de Treasury Fraccionario | ✅ 50/25/25 split |
| P07 | Burn Tokenómico y Control de Supply | ✅ 5% burn rate |
| P08 | Liquidación Criptográfica | ✅ SHA-256 P1→P5 |
| P09 | Validación de Cuentas (CLABE/IBAN) | ✅ Módulo 10 |
| P10 | Reservas y Encaje Fraccionario | ⚠️ Ratio 1.0023 |
| P11 | Reporte Regulatorio y Auditoría | ⚠️ 4 reportes locales |
| P12 | Recuperación de Fondos y Disputas | ✅ Proof chain trazable |
| P13 | Cierre Contable Diario | ✅ Proof of Reserves |

---

## ⚡ Arranque Rápido

### Requisitos

- **Node.js 18+** | **Python 3.10+** | **Hardhat** | **MetaMask**
- **ETH en Base Mainnet** (~$5 USD para gas de deploy)
- **Cuenta Bitso** (KYC Nivel 3) para SPEI payouts
- **Token Banxico SIE API** (gratuito) para valoración MXN oficial

### Instalación

```bash
git clone https://github.com/Rinthae/Catalyst-Blockchain-Structural-Token-.git
cd Catalyst-Blockchain-Structural-Token-
npm install
python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### Compilar contratos

```bash
npx hardhat compile
```

### Desplegar en Base Mainnet (~$5 USD gas)

```bash
# Asegúrate de tener >0.002 ETH en Base Mainnet
# Wallet: configurada en .env (PRIVATE_KEY)
npx hardhat run scripts/deploy_base_minimal.js --network base
```

**Esto despliega 4 contratos en 2 minutos:**
- `CatalystToken` (1B CAT inicial, supply elástico)
- `MXNPriceOracle` (4-pillar pricing)
- `Treasury` (100M CAT funded)
- `SettlementLog` (proof chain registry)

### Probar en Sepolia (GRATIS)

```bash
# Consigue ETH gratis: https://www.alchemy.com/faucets/ethereum-sepolia
npx hardhat run scripts/deploy_base_minimal.js --network sepolia
```

### Valoración MXN en tiempo real (Banxico)

```bash
python Eincode/arke/banxico_oracle.py --save
# Output: USD/MXN FIX $17.4758 | 1 CAT = $1.6544 MXN | 1 GNC = $2.4105 MXN
```

### Convertir CAT → Pesos (calculadora)

```bash
python Eincode/arke/convertir_cat_a_mxn.py --amount 1000
# Muestra las 5 rutas de conversión con fees, tiempos y MXN neto
```

### Operaciones bancarias diarias

```bash
python scripts/daily_bank_operations.py    # 13 protocolos automatizados
python Eincode/arke/banking_agent.py       # Agente bancario autónomo
python Eincode/arke/verificador_cobol_swift.py  # Verificación SWIFT COBOL 88-LEVEL
```

---

## 🔄 Flujo de Conversión a Pesos (6 minutos)

| Paso | Acción | Tiempo | Costo |
|---|---|---|---|
| 1 | Desplegar CAT en Base Mainnet | 2 min | ~$5 USD |
| 2 | Crear pool Uniswap V3 CAT/ETH | 1 min | ~$3 USD |
| 3 | Swap CAT → USDC | 30 seg | ~$0.50 USD |
| 4 | Enviar USDC a Bitso (red Base) | 1 min | ~$0.01 USD |
| 5 | Bitso: USDC → MXN | 5 seg | 0.35% |
| 6 | Bitso → SPEI → BBVA | 30 seg | 0.30% |
| **TOTAL** | | **~6 min** | **~$10.50 USD** |

### 5 Rutas de Conversión (investigadas y verificadas)

| Ruta | Proveedor | Tiempo | Fee |
|---|---|---|---|
| **MXNB Stablecoin Bridge** | Bitso/Juno (CNBV regulado) | 5-30s | 0.8% |
| **Bitso Business SPEI API** | NVIO Pagos (IFPE) | Instantáneo | 0.65% |
| **RedotPay Send Crypto→MXN** | Coinbase Ventures | <5 min | <1% |
| **Crypto Debit Card** | Bybit/Bleap (Mastercard) | POS instantáneo | 0.9% |
| **Merchant QR Payment** | Catalyst + Bitso | Instantáneo | 1.5% |

---

## 🧠 Arquitectura Cognitiva: Pentetraktys 4D

Catalyst Bank opera bajo el modelo cognitivo **Pentetraktys 4D** con 5 fases por cada tarea:

```
PILLAR 1 (Top-Down):    Reglas, protocolos, estructura fija
PILLAR 2 (Bottom-Up):   Evidencia, datos crudos, hechos
PILLAR 3 (Forward):     Proyección temporal, próximas acciones
PILLAR 4 (Reward):      Validación, feedback, detección Hybrys

Ciclo: TESIS → ANTITESIS → SINTESIS → CONCLUSION → HYBRYS → RESET
```

**Hybrys detection:** Si confianza > 0.9 y validación < 0.3 → HYBRYS → RESET automático.

---

## 📁 Estructura del Repositorio

```
├── contracts/                    # Smart Contracts Solidity
│   ├── ElasticCatalystToken.sol  # CAT v2 — supply elástico
│   ├── ElasticSupplyTokens.sol   # GNC v2 + CTV v2 + AIM v2
│   ├── EconomicExpansionOracle.sol # Oracle de expansión económica
│   ├── CatalystToken.sol         # CAT v1 (legacy, 2B hard cap)
│   ├── MXNPriceOracle.sol        # Oracle 4-pillar CAT/USD/MXN/CNY
│   └── ...                       # 30+ contratos de compliance/governance
├── scripts/
│   ├── deploy_base_minimal.js    # 🚀 Deploy a Base Mainnet (4 contratos)
│   ├── deploy_elastic_supply.js  # Deploy elastic supply v2
│   ├── deploy_core.js            # Deploy completo localhost
│   └── daily_bank_operations.py  # Operaciones bancarias diarias
├── Eincode/arke/                 # Motor Bancario Python
│   ├── banxico_oracle.py         # 🏦 Oracle Banxico DOF FIX (en vivo)
│   ├── convert_cat_a_mxn.py     # 💰 Conversor CAT→MXN (5 rutas)
│   ├── banking_agent.py          # Agente bancario autónomo
│   ├── mission_copacabana.py     # Misión Copacabana — 13 cuentas
│   ├── ejecutar_13_triggers_qr.py # 13 triggers QR binarios
│   ├── verificador_cobol_swift.py # Verificador COBOL SWIFT MT103
│   ├── notificacion_banxico_spei.py # Notificación formal a Banxico
│   └── entregar_banco_emisor_multicanal.py # Entrega 12 canales
├── docs/                         # Documentación (211+ archivos)
│   ├── AUTOPOIESIS_ECONOMICA.md  # 🧬 Teoría autopoiética
│   ├── BANKING_PROTOCOLS.md      # 13 protocolos P01-P13
│   ├── ORIGEN_LEGAL_FONDOS_BBVA.md # Origen legal de fondos
│   ├── fideicomiso/              # Módulo de Fideicomiso RWA
│   ├── cobol/                    # 18 programas COBOL ANSI-85
│   └── whitepaper/               # Whitepaper jurídico-técnico
├── apps/catalyst-studio/         # 🖥 Catalyst Studio (React + Vite)
│   └── server/
│       ├── index.js              # Servidor bancario (POST /api/cobrar)
│       ├── bitso_client.js       # Cliente Bitso Business API (SPEI)
│       └── gas_relayer.js        # Gas relayer para Base L2
└── CLAUDE.md                     # 🧠 Cerebro cognitivo del sistema
```

---

## 🔐 Seguridad y Cumplimiento

- **BELL 13450.50:** 31,015 pruebas de seguridad baseline
- **Proof Chain SHA-256:** 5 capas (P1→P5) por cada transacción — inmutable y verificable
- **86 cuentas NIF:** Partida doble contable con retro-población desde Junio 2026
- **Compliance Engines:** Whitelist, KYC, Identity SBT, Freeze Enforcement activos
- **Licencia:** Apache 2.0 — código abierto, auditable, sin restricciones de uso comercial
- **Regulado:** Bitso Business opera como IFPE (NVIO Pagos) bajo Ley Fintech MX

---

## 📜 Licencias y Dockets Activos

| Docket | Tipo | Estado |
|---|---|---|
| CAT-AMP-2026-002 | MT103 Executive Injunction | FILED |
| CAT-SCF-2026-001 | SINFITIVE-CATALYST-FRACTAL | PUBLISHED |
| CAT-NOT-2026-001 | Notarial Certification (6 licenses) | CERTIFIED |
| CAT-R1-MX-20260618 | Economic Medicine R1 | EXECUTED |

---

## 🚀 Roadmap

| Fase | Hito | Estado |
|---|---|---|
| **Q2 2026** | 21 triggers procesados, 13 protocolos, COBOL ANSI-85 | ✅ Completado |
| **Q2 2026** | Elastic Supply V2 (sin MAX_SUPPLY) | ✅ Desplegado |
| **Q2 2026** | Banxico Oracle (valor MXN oficial DOF en vivo) | ✅ Integrado |
| **Q3 2026** | Base Mainnet Deploy + Uniswap V3 Pool | 🔄 En progreso |
| **Q3 2026** | Bitso Business SPEI Payout → BBVA (dinero real) | 🔄 En progreso |
| **Q3 2026** | Fideicomiso RWA — respaldo de tokens con activos reales | 📋 Planeado |
| **Q4 2026** | CNBV Registro IFPE + Banxico PSP | 📋 Planeado |
| **2027** | Banco Digital (Sociedad Financiera Popular) | 📋 Visión |

---

## 🛡️ BELL License 13450.50 — Protección de Patente Estructurada

Catalyst Bank está protegido por la **BELL License 13450.50** — una licencia de patente estructurada diseñada específicamente para sistemas autopoiéticos.

### ¿Qué protege?

- **13× Project Value** en daños liquidados por replicación no autorizada
- Aplicable en todas las jurisdicciones (Common Law + Civil Law + Derecho Internacional)
- Fundada en 5 axiomas de sentido común jurídico universal
- Reconocida como contrato atípico bajo el Código Civil Federal (Art. 1858) y UNIDROIT Principles

### Fundamento Jurídico Internacional

| Tratado | Año | Base |
|---|---|---|
| Convenio de París (Propiedad Industrial) | 1883 | Art. 10bis — Competencia desleal |
| Convenio de Berna (Obras Literarias) | 1886 | Art. 5 — Trato nacional |
| TRIPS (OMC) | 1994 | Art. 45-46 — Daños y medidas provisionales |
| T-MEC / USMCA | 2020 | Cap. 20 — Propiedad Intelectual |
| Principios UNIDROIT | 2016 | Art. 7.4.9 — Pago convenido por incumplimiento |

### Por qué 13× no es una penalización — es compensación autopoiética

```
3× — Trabajo directo y costo de desarrollo
3× — Oportunidad de mercado perdida  
3× — Daño a la integridad sistémica (proof chains, confianza)
3× — Aceleración autopoiética (el sistema del infractor crece con tu arquitectura)
1× — Costos regulatorios y legales
───
13× — Compensación proporcional a la calidad BELL 13450.50
```

**Licencia completa:** [`docs/BELL_LICENSE_13450.50.md`](docs/BELL_LICENSE_13450.50.md)

---

## 🤝 Contribuciones

- Módulos pequeños y enfocados
- Pruebas para toda lógica crítica
- Documenta la intención y decisiones de diseño
- Respeta el ciclo Pentetraktys 4D
- Las contribuciones aceptadas quedan bajo BELL License 13450.50

---

## 📜 Licencias

| Licencia | Alcance |
|---|---|
| **BELL 13450.50** | Patente, replicación, uso comercial, despliegue mainnet, tokenización |
| **Apache 2.0** | Código abierto para estudio, prueba, contribución, integración no comercial |
| **COBOL ANSI-85** | Programas bancarios — Apache 2.0 |

> ⚠️ **Atención:** El código es abierto (Apache 2.0) para estudio y prueba. El despliegue comercial en mainnet, la replicación del sistema, y la tokenización de derivados requiere licencia comercial separada bajo BELL 13450.50. Ver [`docs/BELL_LICENSE_13450.50.md`](docs/BELL_LICENSE_13450.50.md) para detalles completos.

---

> **OSHIRO (大城):** El gran castillo que se construye a sí mismo.  
> **Autopoiesis:** El sistema que convierte entropía en orden, quema en creación, pago en valor.  
> **Principio Antrópico:** Toda expansión está vinculada a actividad económica humana real.  
> **Law of Waters:** All capital must flow.  
> **BELL 13450.50:** La calidad que se protege a sí misma. 13× no es castigo — es justicia.  
>
> *"La seguridad no es un producto. Es un proceso."*
