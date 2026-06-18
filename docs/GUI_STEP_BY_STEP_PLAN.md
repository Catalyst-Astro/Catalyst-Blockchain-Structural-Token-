# Catalyst Mobile GUI — Step-by-Step Project Plan
## App Bancaria Multi-Divisa con NFC + QR + Tarjeta Digital

> **Target:** Mobile Web App (PWA) — iOS Safari + Android Chrome  
> **Stack:** HTML5 + CSS3 + Vanilla JS (cero dependencias)  
> **Principio:** 1 solo archivo, carga instantánea, offline-ready  
> **Diseño:** Mobile-first, BBVA-style card UI + Catalyst Pentetraktys  

---

## STEP 1: Estructura Base (Shell)

**Objetivo:** Que abra en celular, sin scroll horizontal, sin zoom raro.

- [x] Viewport meta tag correcto (`width=device-width, initial-scale=1.0, user-scalable=no`)
- [x] `max-width: 420px; margin: 0 auto` — simula pantalla de app
- [x] `overflow-x: hidden` en body
- [x] Colores oscuros (#0a0a1a fondo, #fff texto) para ahorro de batería OLED
- [x] Fuente del sistema (sin Google Fonts, carga instantánea)

**Archivo:** `apps/catalyst-wallet/index.html` (ya existe — verificar mobile)

---

## STEP 2: Header + Balance Total

**Objetivo:** Mostrar dinero disponible en 1 vistazo.

- [x] Logo CATALYST + tag BELL
- [x] Balance total consolidado (MXN, USD, CNY)
- [x] Variación 24h (simulada por ahora)

---

## STEP 3: Tarjeta Digital (BBVA-style)

**Objetivo:** Tarjeta que se ve como BBVA, con chip y NFC.

- [x] Gradiente oscuro + borde dorado
- [x] Chip dorado (CSS puro)
- [x] Número de tarjeta (tap para revelar)
- [x] Nombre del titular
- [x] Indicador NFC animado (pulso verde)
- [ ] Logo de red (VISA/MC simulado)

---

## STEP 4: Lista de Tokens (6 divisas)

**Objetivo:** Ver cada token con su balance y equivalente fiat.

- [x] 6 rows: CAT, FRT, FLT, AIM, GNC, CTV
- [x] Color distintivo por token
- [x] Balance en token + equivalente MXN
- [x] Tap en token → ver dirección

---

## STEP 5: Botones de Acción

**Objetivo:** 3 acciones principales siempre visibles.

- [x] TAP NFC (modal con animación)
- [x] QR PAGAR (modal con código)
- [x] CONVERTIR CNY → MXN (alerta con datos SWIFT)

---

## STEP 6: Navegación Inferior (Bottom Tab Bar)

**Objetivo:** Navegación tipo app con 4 tabs.

- [ ] 💰 Wallet (vista principal)
- [ ] 💱 Convertir (FX)
- [ ] 📊 Actividad (historial)
- [ ] ⚙️ Más (config, datos bancarios)

---

## STEP 7: Pantalla Convertir (FX)

**Objetivo:** Convertir entre divisas con rate en tiempo real.

- [ ] Selector de par (CAT→MXN, GNC→CNY, CTV→USD, etc.)
- [ ] Input de monto
- [ ] Rate mostrado (4-pillar Pareto)
- [ ] Botón CONVERTIR
- [ ] Confirmación con datos SWIFT

---

## STEP 8: Pantalla Actividad (Historial)

**Objetivo:** Ver últimas transacciones.

- [ ] Lista de transacciones (fecha, monto, tipo)
- [ ] Color por tipo (verde = recibido, rojo = enviado)
- [ ] Tap para ver detalle + proof chain

---

## STEP 9: Pantalla Más (Config)

**Objetivo:** Datos bancarios, CLABEs, SWIFT.

- [ ] CLABE principal + secundaria
- [ ] SWIFT BIC + UETR tracking
- [ ] Direcciones de contratos (GNC, CTV)
- [ ] Exportar wallets
- [ ] Links a docs

---

## STEP 10: PWA (Installable)

**Objetivo:** Que se pueda instalar como app en el celular.

- [ ] manifest.json (nombre, icono, theme_color)
- [ ] Service Worker (cache offline)
- [ ] "Agregar a pantalla de inicio" nativo

---

## STEP 11: Conexión Real (Web3)

**Objetivo:** Conectar con Hardhat node para balances reales.

- [ ] ethers.js ligero (CDN)
- [ ] Leer balance de contratos GNC, CTV, CAT
- [ ] Mostrar balances on-chain reales
- [ ] Ejecutar transacciones reales

---

## STEP 12: Testing + Release

**Objetivo:** Probar en dispositivo real y publicar.

- [ ] Test en iPhone Safari
- [ ] Test en Android Chrome
- [ ] Test en Firefox Mobile
- [ ] Publicar en GitHub Pages
- [ ] URL pública: `https://catalyst-astro.github.io/.../wallet/`

---

## ESTADO ACTUAL: STEP 1-5 COMPLETADOS, STEP 6-12 PENDIENTES
