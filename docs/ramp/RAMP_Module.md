# RAMP Module (Cash ? Transfer Controlado)

## Objetivo
Cash-in/out sólo si: identidad verificada, riesgo AML permitido y evento (EID) verificado con evidencia (VID). Todo queda anclado.

## Contratos
- `RampVault`: escrow condicionado. Estados REQUESTED?CONFIRMED?SETTLED. Requiere `ComplianceGate.validateWithEvent` y que el EID esté VERIFIED.
- `PaymentRefRegistry`: registra `refHash` (SPEI/SWIFT canonizado) ? EID sin PII.

## Parámetros
- `maxPerTx`, `dailyLimitPerWallet`, `cooldownSeconds`, `requireAttestationCount` (mín. atestaciones del evento).
- Roles: `RAMP_OPERATOR` confirma, `COMPLIANCE_ADMIN` configura, `DAO_COUNCIL` ajusta límites.

## Flujo Cash-In
1) Backend crea evento canónico ? EID.
2) `requestCashIn(eid, amount, paymentRefHash)` (valida KYC/AML + evento VERIFICADO).
3) `confirmCashIn(eid, confirmationVID)` por operador (comprobante bancario hash).
4) `settle(eid)` transfiere settlement token al wallet.

## Flujo Cash-Out
1) Wallet aprueba y transfiere tokens al vault en `requestCashOut`.
2) Operador confirma `confirmCashOut` con VID.
3) `settle` remite tokens al operador (representa payout off-chain).

## Evidencia / Anclaje
- EID creado vía EventRegistry; VID de confirmación puede anclarse en EvidenceAnchor.
- `paymentRefHash` = keccak256(canonical_ref) (sin cuentas ni CLABE).

## Endpoints (backend/api)
- `POST /ramps/cash-in/request|confirm`
- `POST /ramps/cash-out/request|confirm`
- `GET /ramps/:eid` estado + logs + on-chain.

## Límites y cumplimiento
- Sin evento VERIFIED ? revierte.
- Sobre maxPerTx/dailyLimit ? revierte.
- Cooldown evita ráfagas sospechosas.
