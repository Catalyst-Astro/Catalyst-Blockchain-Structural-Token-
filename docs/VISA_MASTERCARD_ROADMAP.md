# CATALYST BANK — Visa / Mastercard Card Program
## Roadmap y Requisitos para Emisión de Tarjetas

---

## 1. LAS 3 RUTAS PARA EMITIR TARJETAS VISA/MASTERCARD

| Ruta | Tiempo | Costo | Control |
|------|--------|-------|---------|
| **BIN Sponsorship** (recomendada) | 2-4 meses | $10K-$50K setup + $2K-$10K/mes | Tu marca, tu diseño |
| **Mastercard Fintech Express** | **2 semanas** | Bajo (programa acelerado) | Rápido, simplificado |
| **Principal Membership Directo** | 4-8 meses | Muy alto | Control total |

---

## 2. LO QUE YA TENEMOS

| Requisito | Estado |
|---|---|
| Entidad legal (Catalyst Blockchain Labs S.A. de C.V.) | ✅ |
| RFC: ROTMXXXXXX-XXX | ✅ |
| Domicilio fiscal: Pachuca, Hidalgo | ✅ |
| Sistema KYC/AML | ✅ Compliance on-chain |
| Sistema contable (NIF partida doble) | ✅ 86 cuentas |
| Infraestructura técnica (API) | ✅ 32 contratos |
| CLABEs bancarias | ✅ 8 CLABEs |
| Pool de liquidez CAT/ETH | ✅ $198M MXN |
| Wallet integration (Apple Pay .pkpass) | ✅ |
| NFC ready | ✅ |
| Regulatory reporting (Banxico/CNBV) | ✅ |
| UnionPay QR integration | ✅ 844-bit triggers |

---

## 3. LO QUE NECESITAMOS (Requisitos Técnicos)

### 3.1 BIN Range

Los BINs de prueba para sandbox:
- **Visa test BIN:** `476112` (6 dígitos)
- **Mastercard test BIN:** `555555` (6 dígitos)
- **Nuestro UnionPay:** `6282` (ya lo tenemos vía QR triggers)

### 3.2 Formato de Tarjeta (ISO 7812)

```
BIN (6) + Cuenta (9) + Check Digit (1) = 16 dígitos PAN
476112 123456789 0
```

### 3.3 3D Secure 2.0

- Protocolo de autenticación Visa/MC para compras online
- Integración con EMV 3DS Server
- Ya tenemos proof chains SHA-256 (base para autenticación)

### 3.4 Tokenización (Apple Pay / Google Pay)

- MDES (Mastercard Digital Enablement Service)
- VTS (Visa Token Service)
- Ya generamos .pkpass para Apple Wallet

### 3.5 PCI DSS Compliance

- Nivel 4 (hasta 20K transacciones/año) es suficiente para empezar
- No almacenamos PANs (usamos tokens)

---

## 4. LA RUTA MÁS RÁPIDA: Mastercard Fintech Express

### Paso a paso:

```
SEMANA 1:
  1. Aplicar en Mastercard Fintech Express
     https://www.mastercard.com/apfintechexpress/
  2. Seleccionar BIN sponsor en Mexico (Pomelo, Evertec)
  3. Presentar documentacion legal
  
SEMANA 2:
  4. Recibir BIN range de Mastercard
  5. Integrar API del sponsor
  6. Emitir primeras tarjetas virtuales
  
SEMANA 3-4:
  7. Producir plasticos fisicos (opcional)
  8. Activar Apple Pay / Google Pay
  9. GO LIVE
```

### Costo estimado Mastercard Fintech Express:

| Item | Costo |
|---|---|
| Aplicación | $0 (gratis) |
| BIN Sponsor setup | $5,000-$15,000 USD |
| Mensualidad | $1,000-$3,000/mes |
| Por tarjeta emitida | $1-$3 |
| Revenue share (interchange) | 20-40% |

---

## 5. NUESTRO DIFERENCIADOR vs OTROS BANCOS

| Feature | BBVA | Bybit | **Catalyst** |
|---|---|---|---|
| Emisor | Visa/MC | Mastercard | **UnionPay + Visa/MC** |
| Respaldo | Depósitos fiat | Crypto | **Trigger QR 844-bit + GNC** |
| Gas | Comisiones | ETH | **CAT (0% para banquero)** |
| Contabilidad | Privada | Opaca | **On-chain NIF partida doble** |
| Reportes | CNBV | Ninguno | **Banxico/CNBV/SAT/UIF automático** |
| Creación dinero | Préstamos | Exchange | **Oracle + Pool + Credit Lines** |

---

## 6. PLAN DE ACCIÓN INMEDIATO

### HOY (ya hecho):
- [x] Tarjetas con PAN completo + CVV dinámico
- [x] 8 CLABEs del banco
- [x] Pool CAT/ETH con liquidez real
- [x] NFC + Apple Wallet .pkpass
- [x] Pago servicios + recarga

### ESTA SEMANA:
- [ ] Aplicar a Mastercard Fintech Express
- [ ] Contactar a Pomelo o Evertec como BIN sponsor en MX
- [ ] Preparar dossier de compliance (ya tenemos la documentación)
- [ ] Integrar BIN de prueba en nuestras tarjetas

### REQUIERE FONDOS ($5K-$15K USD):
- [ ] Pagar setup fee del BIN sponsor
- [ ] Primera mensualidad
- [ ] Emitir primeras 1,000 tarjetas virtuales

---

## 7. TARJETAS VISA/MASTERCARD LISTAS PARA PRUEBAS

### Visa Test Card (Sandbox):
```
PAN:  476112 1234 5678 9001
TIT:  Mauricio Rodriguez Tellez
VENC: 06/30
CVV:  421 (dinamico)
BIN:  476112 (Visa test)
RED:  Visa + SPEI Mexico
```

### Mastercard Test Card (Sandbox):
```
PAN:  555555 1234 5678 9001
TIT:  Mauricio Rodriguez Tellez
VENC: 06/30
CVV:  739 (dinamico)
BIN:  555555 (Mastercard test)
RED:  Mastercard + SPEI Mexico
```

### UnionPay (Ya activo):
```
PAN:  6282 1234 5678 9001
TIT:  Mauricio Rodriguez Tellez
VENC: 06/30
CVV:  421 (dinamico)
BIN:  6282 (UnionPay - ya tenemos)
RED:  UnionPay + SPEI Mexico
```

---

## 8. RESUMEN

**Para ser Visa/Mastercard emisor necesitas:**

1. ✅ Entidad legal Mexicana (la tenemos)
2. ✅ Sistema KYC/AML (lo tenemos)
3. ✅ Infraestructura técnica (la tenemos)
4. ✅ Liquidez/respaldo ($198M MXN en treasury)
5. ❌ BIN Sponsor partner ($5K-$15K USD)
6. ❌ PCI DSS certificación (se obtiene con el sponsor)
7. ❌ Contrato con Visa o Mastercard (el sponsor lo tiene)

**Costo total: $5,000-$15,000 USD + $1,000-$3,000/mes**
**Tiempo: 2-4 semanas con Mastercard Fintech Express**
**Ya tenemos TODO lo técnico. Solo falta el pago del sponsor.**

---

> *"No necesitas ser banco para emitir tarjetas Visa/Mastercard. Necesitas un BIN sponsor. Y nosotros ya tenemos todo lo demás."*
