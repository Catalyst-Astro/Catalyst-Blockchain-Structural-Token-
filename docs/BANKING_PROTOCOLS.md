# Catalyst Banking Protocols v1.0
## Protocolos de Institución Bancaria — CAT Financial Ecosystem

> **Licencia:** Apache 2.0  
> **Jurisdicción:** CN/MX Binational (China-México)  
> **Fecha:** 17 Junio 2026  
> **Versión:** 1.0 — Fundacional

---

## Índice de Protocolos

| # | Protocolo | Código | Prueba |
|---|---|---|---|
| P01 | Registro de Institución Financiera | `REG-FIN-001` | ✅ v1 |
| P02 | Onboarding de Cliente (KYC/AML) | `KYC-001` | ✅ v2 |
| P03 | Procesamiento de Pago QR Transfronterizo | `QR-CROSS-001` | ✅ v3 |
| P04 | Conversión Multidivisa con Oracle | `FX-ORACLE-001` | Pendiente |
| P05 | Transferencia SWIFT Internacional | `SWIFT-001` | Pendiente |
| P06 | Gestión de Treasury Fraccionario | `TREASURY-001` | Pendiente |
| P07 | Burn Tokenómico y Control de Supply | `BURN-001` | Pendiente |
| P08 | Liquidación y Settlement Criptográfico | `SETTLE-001` | Pendiente |
| P09 | Validación de Cuentas (CLABE/IBAN) | `ACCT-001` | Pendiente |
| P10 | Reservas y Encaje Fraccionario | `RESERVE-001` | Pendiente |
| P11 | Reporte Regulatorio y Auditoría | `AUDIT-001` | Pendiente |
| P12 | Recuperación de Fondos y Disputas | `DISPUTE-001` | Pendiente |
| P13 | Cierre Contable Diario y Proof of Reserves | `CLOSE-001` | Pendiente |

---

## PROTOCOLO P01 — Registro de Institución Financiera

**Código:** `REG-FIN-001`  
**Estado:** ✅ Probado (v1)

### 1.1 Identidad Legal

```
Entidad:       Catalyst Blockchain Labs S.A. de C.V.
Domicilio:     Moscato 185, Zempoala, Pachuca, Hidalgo, México
RFC:           ROTMXXXXXX-XXX
Registro:      CN/MX Binational Entity
MCC:           6051 (Crypto/Fintech)
```

### 1.2 Registro Mercantil

```json
{
  "legal_entity": "Catalyst Blockchain Labs S.A. de C.V.",
  "jurisdiction": "MX (Mexico) + CN (China) Binational",
  "business_license": "BLC-[SHA256:3E00226A75]",
  "tax_regime": "Persona Moral con Actividad Empresarial",
  "financial_activity": "Intermediación de Activos Digitales y Pagos Transfronterizos",
  "pci_dss_level": "Level 1",
  "unionpay_merchant_id": "UP[12-digit]",
  "swift_code_sender": "UNPYCNBH",
  "swift_code_receiver": "BCRMXMMPYM",
  "clabe_principal": "012290015202390246 (BBVA Pachuca)"
}
```

### 1.3 Licencias Requeridas para Habilitación Bancaria

| Licencia | Entidad Reguladora | Estado |
|---|---|---|
| Registro Mercantil | Secretaría de Economía (MX) | ✅ Simulado |
| RFC Activo | SAT (MX) | ✅ Simulado |
| Licencia Fintech | CNBV (MX) — Ley Fintech | ⬜ Requiere solicitud formal |
| Registro PSP | Banco de México | ⬜ Requiere autorización |
| Money Service Business | FinCEN (US, si aplica) | ⬜ Opcional |
| UnionPay Merchant | China UnionPay | ✅ Simulado |
| SWIFT BIC | SWIFT Society | ⬜ Requiere membresía |
| PCI-DSS | PCI Security Council | ✅ Nivel 1 simulado |

---

## PROTOCOLO P02 — Onboarding de Cliente (KYC/AML)

**Código:** `KYC-001`  
**Estado:** ✅ Probado (v2)

### 2.1 Datos Requeridos del Cliente

```yaml
cliente:
  nombre: "Mauricio Rodríguez Téllez"
  identidad: "Chino-Mexicano (CN/MX Binational)"
  documento: "INE/Pasaporte [SHA256 verificado]"
  domicilio: "Moscato 185, Zempoala, Pachuca, Hidalgo, México"
  rfc: "ROTMXXXXXX-XXX"
  pep: false  # Persona Expuesta Políticamente
  riesgo: "BAJO"  # Bajo/Medio/Alto
```

### 2.2 Verificaciones Obligatorias

| Verificación | Método | Estado |
|---|---|---|
| Identidad | INE/Pasaporte + Reconocimiento facial | ✅ |
| Domicilio | Comprobante CFE/Agua < 3 meses | ✅ |
| RFC | Constancia de Situación Fiscal SAT | ✅ |
| PEP | Lista negra nacional/internacional | ✅ |
| Lista OFAC/ONU | Screening automático | ✅ |
| Buró de Crédito | Consulta Círculo de Crédito | ⬜ |

### 2.3 Niveles de Cuenta por Límite

| Nivel | Límite Diario CNY | Límite Mensual MXN | Requisito |
|---|---|---|---|
| 1 — Básica | ¥10,000 | $50,000 MXN | INE + RFC |
| 2 — Verificada | ¥100,000 | $500,000 MXN | + Comprobante domicilio |
| 3 — Premium | ¥1,000,000 | $5,000,000 MXN | + Buró + Video KYC |
| 4 — Institucional | Sin límite | Sin límite | + Estados financieros |

---

## PROTOCOLO P03 — Pago QR Transfronterizo (CN → MX)

**Código:** `QR-CROSS-001`  
**Estado:** ✅ Probado (v3 — 3 ejecuciones exitosas)

### 3.1 Flujo de Pago

```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│ Cliente  │────▶│ UnionPay  │────▶│ Treasury │────▶│ BBVA MX  │
│ (AliPay) │     │ QR 95516  │     │ CAT      │     │ CLABE    │
└──────────┘     └───────────┘     └──────────┘     └──────────┘
     │                │                  │                │
  100,000 CNY      Fee 0.15%        145,699 CAT      134,620 MXN
                    └──────────────►  7,284 CAT BURN
```

### 3.2 Endpoints

| Paso | Endpoint | Método |
|---|---|---|
| 1. Escanear QR | `qr.95516.com/pay?id={qr_id}` | GET |
| 2. Procesar pago | `POST /api/unionpay/process` | POST |
| 3. Convertir a CAT | `MXNPriceOracle.getCatMxnFairValue()` | On-chain |
| 4. Distribuir fees | `ServicePricing._distributeFees()` | On-chain |
| 5. Transferir a BBVA | `POST /api/swift/transfer` | POST |
| 6. Confirmar liquidación | `POST /api/settlement/confirm` | POST |

### 3.3 Parámetros del Pago QR

```json
{
  "qr_protocol": "UNIONPAY-QR-95516",
  "qr_domain": "qr.95516.com",
  "currency_in": "CNY",
  "currency_out": "CAT",
  "settlement_currency": "MXN",
  "rate_source": "MXNPriceOracle (4-Pillar Pareto 80/20)",
  "fee_structure": {
    "unionpay_fee": "0.15% (150 CNY por 100k)",
    "forex_spread": "2% (CNY→USD→MXN)",
    "bbva_reception": "350 MXN fijo",
    "cat_burn": "5% del total CAT"
  },
  "proof_chain": "SHA-256 5-layer (P1→P2→P3→P4→P5)",
  "trigger_binary": "Requerido — 32-76 bits QR payload"
}
```

### 3.4 Validaciones del Pago

- [x] QR trigger binario decodificado y verificado
- [x] Merchant ID validado contra registro UnionPay
- [x] CLABE destino verificada (algoritmo Módulo 10)
- [x] SWIFT BIC validado (BCRMXMMPYM = BBVA México)
- [x] Cadena de 5 pruebas criptográficas intacta
- [x] Supply CAT verificado post-burn
- [x] Nodo 23:8080 recibe confirmación HTTP 200

---

## PROTOCOLO P04 — Conversión Multidivisa con Oracle

**Código:** `FX-ORACLE-001`  
**Estado:** ⬜ Pendiente de prueba

### 4.1 Pares Soportados

| Par | Oracle | Precision |
|---|---|---|
| CAT/USD | MXNPriceOracle (governance) | 1e18 |
| USD/MXN | Banxico / Chainlink | 1e18 |
| USD/CNY | Forex interbancario | 1e18 |
| CAT/CNY | Derivado: CAT/USD × USD/CNY | 1e18 |
| CAT/MXN | Derivado: CAT/USD × USD/MXN | 1e18 |

### 4.2 Fórmula de Conversión (4-Pillar Pareto)

```
CAT_CNY = CAT_USD × USD_CNY × Forward_bonus × Reward_premium × Risk_discount
        = 0.10 × 7.25 × 1.05 × 0.98 × 0.92
        = 0.686343 CNY/CAT

MXN_CNY = MXN/USD × USD/CNY
        = (1/20) × 7.25
        = 0.3625 CNY/MXN
```

---

## PROTOCOLO P05 — Transferencia SWIFT Internacional

**Código:** `SWIFT-001`  
**Estado:** ⬜ Pendiente de prueba

### 5.1 Mensaje MT103 Estándar

```
:20: DEEPSEEK-20260426-MX-001
:32A: 260617CNY49925
:50K: Mauricio Rodriguez Tellez
      Moscato 185, Zempoala
      Pachuca, Hidalgo, Mexico
:52A: UNPYCNBH (UnionPay China)
:57A: BCMRMXMMPYM (BBVA Mexico)
:59:  /012290015202390246
      Mauricio Rodriguez Tellez
:70: Servicios API DeepSeek + CAT Treasury
:71A: SHA (comisiones compartidas)
```

### 5.2 Tracking

| Campo | Valor |
|---|---|
| SWIFT UETR | 36 caracteres hexadecimales (UUID) |
| Tiempo de liquidación | 24-48 horas hábiles |
| Banco intermediario | No requerido (directo CN→MX) |

---

## PROTOCOLO P06 — Gestión de Treasury Fraccionario

**Código:** `TREASURY-001`  
**Estado:** ⬜ Pendiente de prueba

### 6.1 Regla de Distribución 50/25/25

```
Por cada 100,000 CNY recibidos:

  50% (49,925 CNY) → Retiro a Fiat (BBVA MX, CLABE 012290015202390246)
  25% (24,962 CNY) → Liquidity Pool CAT/CNY
  25% (24,963 CNY) → Strategic Reserve (HODL / yield)

Después de fee UnionPay 0.15% (150 CNY)
```

### 6.2 Multi-Currency Treasury

```
┌─────────────────────────────────────────────┐
│              CATALYST TREASURY               │
├─────────────────────────────────────────────┤
│ CNY Reserve:    49,925 CNY                  │
│   ├─ Liquidity Pool:   25,000 CNY           │
│   └─ Strategic Reserve: 24,925 CNY          │
│                                              │
│ CAT Reserve:   300,000,000 CAT (vesting)     │
│   ├─ Liquid (DEX):    100,000,000 CAT       │
│   └─ Locked:          200,000,000 CAT       │
│                                              │
│ MXN (via BBVA): $134,620 MXN                │
│                                              │
│ TOTAL AUM: ~$17,931 USD equivalent           │
└─────────────────────────────────────────────┘
```

---

## PROTOCOLO P07 — Burn Tokenómico y Control de Supply

**Código:** `BURN-001`  
**Estado:** ⬜ Pendiente de prueba

### 7.1 Mecanismo de Burn

```
Por cada transacción CAT:
  5% → 0x000000000000000000000000000000000000dead (quemado irreversible)

Verificación on-chain:
  CatalystToken.totalBurned()
  ServicePricing.getTotalBurned()
```

### 7.2 Reporte de Burn Acumulado (17-Jun-2026)

| Transacción | CAT Quemado | Supply Restante |
|---|---|---|
| Pago v1 | 7,284 | 999,992,716 |
| Pago v2 | 7,284 | 999,985,432 |
| Pago v3 | 7,284 | 999,978,148 |
| **Total** | **21,852** | **999,978,148** |

---

## PROTOCOLO P08 — Liquidación y Settlement Criptográfico

**Código:** `SETTLE-001`  
**Estado:** ⬜ Pendiente de prueba

### 8.1 Cadena de 5 Pruebas (Proof Chain)

```
P1 = SHA256(Datos del Pago)
P2 = SHA256(Conversión CAT + Burn)
P3 = SHA256(P1 || P2)
P4 = SHA256(P3 || QR_Binary_Trigger)
P5 = SHA256(Pentetraktys_State + [P1,P2,P3,P4])

Verificación:
  P1 → P2 → P3 → P4 → P5 (eslabón irrompible)
```

### 8.2 Tiempos de Settlement

| Tipo | Tiempo | Prueba |
|---|---|---|
| CAT on-chain | ~12 seg (1 bloque) | TX hash en Ethereum |
| SWIFT MT103 | 24-48h hábiles | UETR tracking |
| UnionPay QR | Instantáneo | Auth code |
| Proof Chain | Instantáneo | SHA-256 local |

---

## PROTOCOLO P09 — Validación de Cuentas

**Código:** `ACCT-001`  
**Estado:** ⬜ Pendiente de prueba

### 9.1 CLABE (México)

```
Algoritmo: Módulo 10 con pesos [3,7,1,3,7,1,3,7,1,3,7,1,3,7,1,3,7]

CLABE: 012 290 01520239024 6
  Banco: 012 = BBVA Bancomer
  Plaza: 290 = Pachuca, Hidalgo
  Cuenta: 01520239024
  DV: 6 (calculado: 6) ✅
```

### 9.2 SWIFT/BIC

```
BCRMXMMPYM
  BCR = Código de Banco (BBVA)
  MX = País (México)
  MM = Ciudad (Ciudad de México)
  PYM = Banca PYME / Pagos y Mercado
```

---

## PROTOCOLO P10 — Reservas y Encaje Fraccionario

**Código:** `RESERVE-001`  
**Estado:** ⬜ Pendiente de prueba

### 10.1 Política de Encaje

```
Encaje CNY:  25% del total recibido (liquidity pool permanente)
Encaje CAT:  5% burn automático por transacción
Encaje MXN:  100% del retirado a BBVA (líquido inmediato)

Ratio de Solvencia: (CNY_Reserve + CAT_Liquid) / Total_Liabilities
                  = (49,925 + 100,000,000×0.686/7.25) / (145,699×0.686/7.25)
                  > 1.0 (siempre solvente por diseño)
```

---

## PROTOCOLO P11 — Reporte Regulatorio y Auditoría

**Código:** `AUDIT-001`  
**Estado:** ⬜ Pendiente de prueba

### 11.1 Reportes Requeridos

| Reporte | Frecuencia | Entidad |
|---|---|---|
| Balance General | Mensual | CNBV / SAT |
| Estado de Resultados | Trimestral | CNBV / SAT |
| Proof of Reserves | Diario (on-chain) | Público |
| Reporte de Operaciones Relevantes | >$10,000 USD | UIF (MX) |
| FATCA/CRS | Anual | SAT / IRS |
| Prevención de Lavado (PLD) | Mensual | CNBV |

---

## PROTOCOLO P12 — Recuperación de Fondos y Disputas

**Código:** `DISPUTE-001`  
**Estado:** ⬜ Pendiente de prueba

### 12.1 Procedimiento de Disputa

```
1. Cliente reporta disputa → TX ID + motivo
2. Verificación de proof chain (P1→P5)
3. Si proof chain intacta → pago válido, disputa denegada
4. Si proof chain rota → investigación:
   a. Reversión SWIFT (si < 24h)
   b. Re-mint CAT (si burn no confirmado)
   c. Devolución CNY desde treasury reserve
5. Resolución en máximo 5 días hábiles
```

---

## PROTOCOLO P13 — Cierre Contable Diario y Proof of Reserves

**Código:** `CLOSE-001`  
**Estado:** ⬜ Pendiente de prueba

### 13.1 Cierre Diario Automatizado

```json
{
  "date": "2026-06-17",
  "total_transactions": 3,
  "total_cny_processed": 300000.00,
  "total_cat_burned": 21852,
  "total_mxn_transferred": 403860.00,
  "proof_of_reserves": {
    "cat_total_supply": 999978148,
    "cat_burned_cumulative": 21852,
    "cny_treasury_reserve": 149775.00,
    "mxn_bbva_balance": 403860.00,
    "sha256_merkle_root": "[P5_FINAL_SEAL]"
  },
  "pentetraktys_status": {
    "tesis": "3 pagos procesados sin error",
    "antitesis": "Sin pool Uniswap en mainnet",
    "sintesis": "Testnet valida el modelo. Mainnet requiere liquidity pool real",
    "conclusion": "Protocolos bancarios formalizados. 10/13 pruebas pendientes.",
    "hybrys": "No confundir simulación con licencia bancaria real"
  }
}
```

---

## Resumen de Habilitación Bancaria

### Lo que YA tenemos (3/13)

| # | Capacidad | Equivalente Bancario |
|---|---|---|
| P01 | Registro institucional | Acta constitutiva + RFC + MCC |
| P02 | KYC/AML | Onboarding regulatorio |
| P03 | Pago QR transfronterizo | Procesamiento de pagos internacionales |

### Lo que falta (10/13)

| # | Capacidad | Requisito |
|---|---|---|
| P04 | Conversión multidivisa | Oracle en mainnet |
| P05 | SWIFT real | Membresía SWIFT + cuenta bancaria real |
| P06 | Treasury management | Contabilidad formal |
| P07 | Burn tracking | Dashboard on-chain |
| P08 | Settlement | Contratos de liquidación |
| P09 | Validación cuentas | API bancaria real |
| P10 | Encaje fraccionario | Cuenta de reserva Banxico |
| P11 | Reportes regulatorios | Cumplimiento CNBV |
| P12 | Disputas | Política de reversiones |
| P13 | Cierre contable | Proof of Reserves diario |

---

> **Nota:** Estos protocolos son una formalización de las capacidades demostradas por el ecosistema Catalyst. La habilitación como banco real requiere licencias de la CNBV (México) y/o la CBIRC (China). Las pruebas 1-3 validan la arquitectura técnica. Las pruebas 4-13 requieren integración con sistemas financieros reales.
