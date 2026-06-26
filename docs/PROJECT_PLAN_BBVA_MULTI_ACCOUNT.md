# 📋 CATALYST BANK — PLANEACIÓN DE PROYECTO
## Distribución Multi-Cuenta BBVA para Grandes Fondos

> **Versión:** 1.0.0 | **Fecha:** 25 Junio 2026  
> **Metodología:** Waterfall-Hybrid (Fases secuenciales con revisiones regulatorias)  
> **Estándar:** COBOL ANSI-85 · BELL-13450-50 · Apache 2.0

---

## 🎯 Problema

BBVA no puede procesar un pago único de **$1,553,462,360,000 MXN**. Ni SPEI ni SWIFT manejan montos de esta magnitud en una sola transacción. Se requiere una estrategia de **distribución multi-cuenta** para cumplir con límites bancarios, regulatorios y fiscales.

---

## 📊 Flujograma del Proyecto

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CATALYST BBVA MULTI-ACCOUNT PROJECT                    │
│                        Waterfall-Hybrid SDLC                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │ F1: ANÁLISIS  │       │ F2: DISEÑO    │       │ F3: DESARROLLO │
    │ Regulatorio   │  ───▶ │ Multi-Cuenta  │  ───▶ │ COBOL CATDIST  │
    └───────────────┘       └───────────────┘       └───────────────┘
            │                       │                       │
    ┌───────┴───────┐       ┌───────┴───────┐       ┌───────┴───────┐
    │ SPEI limits   │       │ 10 CLABEs      │       │ CATDIST.cbl   │
    │ CNBV MTU caps │       │ Capacidad $3B  │       │ CATBANK.cbl   │
    │ SAT reporting │       │ Batch 100 TX   │       │ CATJRNL.cbl   │
    │ SWIFT >$500K  │       │ Fee 0.1%       │       │ CATSWIFT.cbl  │
    └───────────────┘       └───────────────┘       └───────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │ F4: PRUEBAS   │       │ F5: DESPLIEGUE│       │ F6: MANTEN.   │
    │ Sandbox SPEI   │  ───▶ │ Producción     │  ───▶ │ Monitoreo     │
    └───────────────┘       └───────────────┘       └───────────────┘
            │                       │                       │
    ┌───────┴───────┐       ┌───────┴───────┐       ┌───────┴───────┐
    │ Bitso sandbox  │       │ 10 BBVA real   │       │ Auditoría     │
    │ CEP verif.     │       │ SPEI + SWIFT   │       │ Reportes CNBV │
    │ Proof chain    │       │ CEP tracking   │       │ ICAP 10.5%    │
    └───────────────┘       └───────────────┘       └───────────────┘
```

---

## 🏦 Flujograma de Distribución (CATDIST.cbl)

```
                        ┌─────────────────┐
                        │  TOTAL FUNDS    │
                        │ $1,553,462M MXN │
                        └────────┬────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ VALIDAR CAPACIDAD        │
                    │ 10 cuentas × $500M = $3B │
                    │ ✅ Suficiente             │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ CUENTA 1: CONC. │ │ CUENTA 2: OPER. │ │ CUENTA 3: CHEQ. │
    │ $500M       │ │ $500M       │ │ $300M       │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
              │                  │                  │
    ┌─────────▼─────────┐ ┌─────▼──────────┐ ┌─────▼──────────┐
    │ 50 TX × $10M      │ │ 50 TX × $10M   │ │ 30 TX × $10M   │
    │ Fee: $500K        │ │ Fee: $500K     │ │ Fee: $300K     │
    └───────────────────┘ └────────────────┘ └────────────────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ SWIFT MT103 (>$300M)     │
                    │ 5 cuentas con UETR       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │ REPORTE FINAL + SEAL    │
                    │ CATRPT + CATSWIFT       │
                    └─────────────────────────┘
```

---

## 📐 Arquitectura de Cuentas BBVA

| # | CLABE | Tipo | Capacidad | Estrategia |
|---|---|---|---|---|
| 1 | 012290015202390246 | Concentradora | $500M | Principal — recibe lotes de $10M |
| 2 | 012180015123243964 | Operadora | $500M | Secundaria — distribución SPEI |
| 3 | 012290015202390259 | Cheques Principal | $300M | Cheques certificados |
| 4 | 012290015202390262 | Débito | $200M | Gastos operativos |
| 5 | 012290015202390275 | Crédito | $200M | Líneas de crédito |
| 6 | 012290015202390288 | Ahorro/Inversión | $500M | Reserva largo plazo |
| 7 | 012290015202390291 | Pagos Servicios | $100M | Pagos recurrentes |
| 8 | 072290015202390252 | Crypto Bridge | $300M | Bitso on/off ramp |
| 9 | 014290015202390247 | Santander Recaudadora | $200M | Diversificación bancaria |
| 10 | 021290015202390248 | HSBC Pagadora | $200M | Diversificación bancaria |
| **TOTAL** | | | **$3,000M** | |

---

## 🔢 Parámetros de Distribución

| Parámetro | Valor | Fundamento |
|---|---|---|
| Fondos totales | $1,553,462,360,000 MXN | COBOL CATBANK |
| Máximo por cuenta | $500,000,000 MXN | SPEI límite práctico |
| Máximo por transacción | $10,000,000 MXN | CNBV MTU + SAT |
| Transacciones por lote | 100 | Eficiencia operativa |
| Fee por transacción | 0.1% | SPEI + Bitso |
| Número de cuentas | 10 | Diversificación |
| Capacidad total | $3,000,000,000 MXN | Margen de seguridad |
| SWIFT (>$300M) | 5 cuentas | Trazabilidad internacional |

---

## 📈 Cronograma (6 Fases Waterfall-Hybrid)

```
F1 ANÁLISIS         ████████░░░░░░░░░░░░░░░░░░░░  2 días
F2 DISEÑO           ░░░░░░░░████████░░░░░░░░░░░░░░  3 días
F3 DESARROLLO       ░░░░░░░░░░░░░░░░████████░░░░░░  5 días
F4 PRUEBAS          ░░░░░░░░░░░░░░░░░░░░░░░░████░░  3 días
F5 DESPLIEGUE       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  2 días
F6 MANTENIMIENTO    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  continuo
────────────────────────────────────────────────────
TOTAL: 15 días hábiles
```

---

## 📋 Entregables por Fase

### F1: Análisis Regulatorio
- [x] SPEI limits: sin máximo sistema, límites por banco
- [x] CNBV MTU: $12,500 MXN default, configurable
- [x] SAT: reporte automático >$15,000 MXN
- [x] SWIFT: recomendado >$500,000 MXN por transacción

### F2: Diseño Multi-Cuenta
- [x] 10 CLABEs BBVA (7 BBVA + 2 otros bancos + 1 crypto)
- [x] Capacidad total $3B MXN (>$1.5B requerido)
- [x] Estrategia de lotes: 100 TX por cuenta
- [x] SWIFT para cuentas con >$300M

### F3: Desarrollo COBOL
- [x] CATDIST.cbl — Distribución multi-cuenta
- [x] CATBANK.cbl — Sistema bancario orquestador
- [x] CATJRNL.cbl — Partida doble NIF
- [x] CATSWIFT.cbl — MT103 generator

### F4: Pruebas
- [ ] Bitso sandbox SPEI
- [ ] CEP Banxico verificación
- [ ] Proof chain SHA-256
- [ ] Stress test: 10,000 TX

### F5: Despliegue
- [ ] Activar 10 CLABEs BBVA reales
- [ ] SPEI producción via Bitso
- [ ] SWIFT MT103 transmisión
- [ ] Monitoreo en tiempo real

### F6: Mantenimiento
- [ ] Auditoría diaria (reportes CNBV)
- [ ] ICAP >10.5%
- [ ] Proof of Reserves semanal
- [ ] Buzón regulatorio automático

---

## 🖥️ COBOL Ejecutable

```bash
export COB_CONFIG_DIR=/ucrt64/share/gnucobol/config
cd "docs/cobol"
cobc -x -free -std=cobol85 -o catdist.exe CATDIST.cbl && ./catdist.exe
```

---

> **Metodología:** Waterfall-Hybrid — Fases secuenciales con revisiones regulatorias al final de cada fase.  
> **Fuentes:** [SPEI Banxico](https://www.banxico.org.mx/spei/) · [GnuCOBOL 3.2 Manual](https://gnucobol.sourceforge.io/doc/gnucobol.html) · [IBM COBOL Best Practices](https://www.ibm.com/docs/en/cobol-zos)
