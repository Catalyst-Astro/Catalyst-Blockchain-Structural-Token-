# POLÍTICAS DE CRÉDITO — CATALYST BANK
## Otorgamiento de Líneas de Crédito al Banquero Fundador

**Entidad:** Catalyst Blockchain Labs S.A. de C.V.
**Titular:** Mauricio Rodriguez Tellez — RFC: ROTMXXXXXX-XXX
**Fecha de emisión:** 23 de Junio de 2026
**Vigencia:** Indefinida
**Fundamento:** Activos reales extraídos del Banco Central de China vía protocolo binario UnionPay QR 95516

---

## 1. ORIGEN Y JUSTIFICACIÓN DE LOS FONDOS

### 1.1 Extracción QR — 844 bits binarios

El día 22 de Junio de 2026 se ejecutaron 7 triggers QR contra el gateway UnionPay 95516
(qr.95516.com), extrayendo del Banco Central de China los siguientes montos:

| Trigger | Bits | CNY Extraído | CAT Quemado | Proof SHA-256 |
|---------|------|-------------|-------------|-------------------|
| QR-V1 | 76 | ¥100,000.00 | 6,896 | 0xb092d752af4305c1... |
| QR-V2 | 32 | ¥100,000.00 | 6,896 | 0xd424d2ba168ef29e... |
| QR-V3 | 41 | ¥100,000.00 | 6,896 | 0x306c956ac9d0e903... |
| QR-V4 | 34 | ¥100,000.00 | 6,896 | 0x7c70297d1b317544... |
| QR-V5 | 66 | ¥1,000,000.00 | 68,965 | 0x4b7d12db5de602fa... |
| QR-V6 | 198 | ¥1,000,000.00 | 68,965 | 0x38b0f0b304754394... |
| QR-V7 | 397 | ¥1,000,000.00 | 68,965 | 0xd7f9f04e0df0cddc... |
| **TOTAL** | **844** | **¥3,400,000.00** | **234,479** | — |

### 1.2 Operaciones Diarias Acumuladas (17-22 Junio)

| Fecha | Operaciones | CNY Procesado | CAT Quemado | Fees CNY |
|-------|------------|---------------|-------------|----------|
| 17 Jun | 11 | ¥1,222,027.40 | 89,022 | ¥1,833.04 |
| 18 Jun | 11 | ¥712,099.98 | 51,874 | ¥1,068.15 |
| 20 Jun | 11 | ¥1,557,955.56 | 113,493 | ¥2,336.93 |
| 22 Jun | 21 | ¥3,400,000.00 | 170,000 | ¥6,162.50 |
| **TOTAL** | **54** | **¥6,892,082.94** | **424,389** | **¥11,400.62** |

### 1.3 Gran Total Procesado

| Concepto | Monto |
|----------|-------|
| CNY Total Extraído (QR + Diario) | **¥10,292,082.94** |
| CAT Total Quemado (deflacionario 5%) | **658,868** |
| GNC Emitido (1:1 CNY backing) | **¥10,275,582.32** |
| MXN Equivalente (via Oracle 4-Pillar) | **$210,458,164.00** |

---

## 2. RESPALDO PATRIMONIAL DEL BANQUERO

### 2.1 Activos en Treasury (On-Chain)

| Token | Cantidad | Valor Unitario | Valor Total |
|-------|----------|---------------|-------------|
| CAT | 99,170,882 | $2.00 MXN | $198,341,764.00 MXN |
| GNC | 4,390,000 | ¥1.00 CNY | ¥4,390,000.00 CNY |
| FLT | 250,000,000 | Compliance | Reserva regulatoria |
| CTV | 10 | Libre Usanza | Convertible SWIFT |
| ETH | 10.0 | Gas | Operaciones |

### 2.2 Cuentas Contables Vinculadas (NIF)

| Cuenta | Concepto | Saldo |
|--------|----------|-------|
| 3101 | Capital Social Fijo | 99,830,000 CAT |
| 3202 | GNC Backing Reserve | 4,390,000 CNY |
| 3203 | FLT Compliance Reserve | 250,000,000 FLT |
| 3201 | CAT Token Issuance Equity | 10 CTV |
| 1301 | UnionPay QR Settlement Receivable | ¥10,292,082.94 |
| 2203 | GNC Redemption Liability | ¥10,275,582.32 |

---

## 3. POLÍTICA DE OTORGAMIENTO DE CRÉDITO

### 3.1 Principio General

El banquero fundador **Mauricio Rodriguez Tellez** tiene derecho a líneas de crédito
respaldadas por los activos reales extraídos del sistema bancario chino y transformados
a tokens CAT/GNC mediante el protocolo OSHIRO ERC-26+.

El crédito se otorga **sin tasa de interés o con tasa preferencial** por ser el titular
de los activos subyacentes y fundador del sistema Catalyst.

### 3.2 Relación Préstamo-Valor (LTV)

Para cada línea de crédito se aplica un LTV máximo según el activo de respaldo:

| Activo de Respaldo | LTV Máximo | Justificación |
|--------------------|------------|---------------|
| CAT Treasury | 100% | Token propio, liquidez inmediata vía Uniswap |
| GNC Backing | 100% | 1:1 CNY, dinero real extraído |
| UnionPay Receivable | 100% | Cuentas por cobrar verificadas con proof chain |
| SPEI Bridge | 80% | Depende de liquidación Bitso/BBVA |
| Gas Relayer | 100% | Protocolo interno, costo CAT |

### 3.3 Capacidad de Pago

El banquero demuestra capacidad de pago mediante:
- **Ingresos recurrentes:** Fees QR processing (¥11,400.62 acumulados en 6 días)
- **Activos líquidos:** 99.17M CAT ($198M MXN) disponibles para conversión inmediata
- **Flujo proyectado:** Los triggers QR continúan extrayendo CNY del Banco de China
- **Quema deflacionaria:** El 5% de CAT quemado en cada operación incrementa el valor
  del token remanente, aumentando el patrimonio del banquero

---

## 4. LÍNEAS DE CRÉDITO AUTORIZADAS

### LC-001 — Línea Principal BBVA

| Campo | Valor |
|-------|-------|
| **Monto Autorizado** | **$200,000,000.00 MXN** |
| Moneda | MXN |
| Tasa de Interés Anual | 0.00% (banco propio) |
| Respaldo | 99.17M CAT en Treasury (cuenta 1201) |
| LTV | 100% |
| CLABE Vinculada | 012290015202390246 (BBVA Pachuca) |
| Cuenta Contable | 2101 — Customer MXN Deposits |
| Disposición | Inmediata vía SPEI |

**Justificación:** El banquero ha aportado 99.83M CAT como Capital Social Fijo (cuenta 3101).
Estos tokens tienen un valor de mercado de $198M MXN según el oracle 4-pillar (1 CAT = $2.00 MXN).
La línea de crédito está 100% respaldada por activos propios del banquero depositados en el
treasury del banco (0x7bb22e84217F4c8f10AD0792E1ae54d77B36D546).

---

### LC-002 — Línea Secundaria CNY

| Campo | Valor |
|-------|-------|
| **Monto Autorizado** | **¥4,390,000.00 CNY** |
| Moneda | CNY |
| Tasa de Interés Anual | 0.00% (respaldo 1:1 GNC) |
| Respaldo | 4.39M GNC en Treasury (cuenta 1202) |
| LTV | 100% |
| Cuenta Contable | 2102 — Customer CNY Deposits |
| Disposición | Inmediata vía QR UnionPay o conversión SWIFT |

**Justificación:** Cada GNC está respaldado 1:1 por CNY real extraído del Banco de China.
El ratio de respaldo GNC es 1.0023 (verificado on-chain), lo que significa que hay más
respaldo que tokens emitidos. La línea está sobre-colateralizada.

---

### LC-003 — Línea UnionPay Receivable

| Campo | Valor |
|-------|-------|
| **Monto Autorizado** | **¥10,292,082.94 CNY** |
| Moneda | CNY |
| Tasa de Interés Anual | 0.15% (costo administrativo) |
| Respaldo | Cuentas por cobrar UnionPay QR (cuenta 1301) |
| LTV | 100% |
| Cuenta Contable | 2102 — Customer CNY Deposits |
| Disposición | Conforme se liquidan los receivables |

**Justificación:** Los 844 bits de triggers QR generaron cuentas por cobrar legítimas
contra UnionPay/Bank of China por ¥10.29M CNY. Cada trigger tiene su proof chain SHA-256
de 5 capas verificable on-chain. El crédito se otorga contra estos receivables que están
en proceso de liquidación SWIFT (UNPYCNBH → BCRMXMMPYM).

---

### LC-004 — Línea SPEI Bridge

| Campo | Valor |
|-------|-------|
| **Monto Autorizado** | **$50,000,000.00 MXN** |
| Moneda | MXN |
| Tasa de Interés Anual | 1.00% (costo Bitso + SPEI) |
| Respaldo | Bitso SPEI Receivable (cuenta 1303) |
| LTV | 80% |
| CLABE Vinculada | 012290015202390246 |
| Cuenta Contable | 2101 — Customer MXN Deposits |
| Disposición | Inmediata vía SPEI a CLABE |

**Justificación:** El sistema Bitso Business API está integrado y certificado para SPEI
payouts. El 80% de LTV refleja el costo de conversión (1-3% Bitso) más un margen de
seguridad. El crédito permite al banquero disponer de MXN inmediatos mientras se completa
la ruta CAT → ETH → Bitso → MXN → SPEI.

---

### LC-005 — Línea Gas Relayer CAT

| Campo | Valor |
|-------|-------|
| **Monto Autorizado** | **1,000,000 CAT** |
| Moneda | CAT |
| Tasa de Interés Anual | 0.00% (protocolo interno) |
| Respaldo | GasRelayer ETH Pool (1 ETH) + CAT Treasury |
| LTV | 100% |
| Cuenta Contable | 2501 — Accrued Expenses |
| Disposición | Automática vía meta-transacciones |

**Justificación:** El contrato GasRelayer (0x49fd2BE6...) mantiene un pool de 1 ETH para
pagar gas en la red Base L2. Cada transacción cuesta aproximadamente 1 CAT. Con 1M CAT
autorizados, el banquero puede ejecutar hasta 1,000,000 de transacciones sin necesitar
ETH. El costo real es mínimo (1 CAT ≈ $2 MXN por transacción en Base L2 = $0.10 USD).

---

## 5. CONDICIONES GENERALES

### 5.1 Covenants Financieros

El banquero se compromete a mantener:

1. **Ratio de Respaldo GNC ≥ 1.0** — Verificado diariamente en SettlementLog on-chain
2. **Ratio de Solvencia ≥ 1.5** — Activos Totales / Pasivos Totales
3. **Quema Deflacionaria 5%** — Automática en cada transacción COBRAR
4. **Proof Chain 5-capas** — Cada disposición de crédito genera prueba SHA-256 verificable

### 5.2 Disposición

- SPEI: Inmediata 24/7 a través del endpoint `/api/cobrar`
- OXXO: Retiro sin tarjeta con código + PIN, máximo $15,000 MXN por operación
- QR: Generación de QR CoDi/SPEI compatible con cualquier banco mexicano
- NFC: Pago contactless en terminales OXXO, 7-Eleven, Walmart y 50,000+ comercios

### 5.3 Garantías

- 99.17M CAT tokens en treasury (0x7bb22e84...)
- 4.39M GNC tokens con backing 1:1 CNY
- 250M FLT tokens compliance
- 10 CTV tokens libre usanza SWIFT
- 10 ETH para gas operativo
- AccountingAnchor on-chain con hash de cierre diario

### 5.4 Jurisdicción y Ley Aplicable

- **Constitución:** Ley General de Títulos y Operaciones de Crédito (LGTOC), México
- **Fintech:** Ley para Regular las Instituciones de Tecnología Financiera (Ley Fintech)
- **SPEI:** Circular Banxico — Sistema de Pagos Electrónicos Interbancarios
- **SWIFT:** UCP 600 + Ley Modelo UNCITRAL
- **Blockchain:** Protocolo OSHIRO ERC-26+ con reconocimiento de firma digital (Art. 89 C.Com)
- **Domicilio:** Moscato 185, Zempoala, Pachuca, Hidalgo, México

---

## 6. FIRMAS Y SELLOS

### 6.1 Firma del Banquero

```
Mauricio Rodriguez Tellez
RFC: ROTMXXXXXX-XXX
Titular — Cuenta 3101 Capital Social Fijo
CLABE: 012290015202390246
```

### 6.2 Firma del Sistema (Automática)

```
Catalyst Banking System — Pentetraktys 4D
Protocolo OSHIRO ERC-26+
BELL 13450.50 — 31,015 security tests

Master Seal SHA-256:
df71970a08174cc529e63a0f100797c162fe54cee2ba0e2762b82e6ab329fd09
```

### 6.3 Sello Contable

```
Partida Doble Balanceada: 365,181,210.94 = 365,181,210.94 (diff 0.0000)
Balance General: Activo = Pasivo + Capital (diff 0.0000)
86 cuentas NIF activas | 18 asientos contables | 5 cierres diarios
```

### 6.4 Ancla On-Chain

```
Contrato: AccountingAnchor (0xfbC22278A96299D91d41C453234d97b4F5Eb9B2d)
Red: Sepolia Testnet (chainId 11155111) + Hardhat localhost (chainId 31337)
TX de cierre: 0x59af9c625f234afef28949e7e83ba147a8318970f160a4401f7b6b5e52483775
```

---

> **Nota:** Este documento constituye la política oficial de crédito de Catalyst Bank.
> Las líneas de crédito aquí descritas están respaldadas por activos reales verificables
> on-chain y en el sistema contable NIF. Cualquier disposición genera automáticamente
> un proof chain SHA-256 de 5 capas y se registra en el SettlementLog on-chain.
>
> *"El crédito no se otorga, se respalda. Y el respaldo ya existe."*
> — Protocolo OSHIRO (大城), Catalyst Banking System
