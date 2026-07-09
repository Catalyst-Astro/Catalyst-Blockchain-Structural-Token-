# EVENTS Module (EID/VID + Atestación + Verificación)

## Principios
- **Sin PII on-chain**: solo hashes canónicos (`payloadHash`, `EID`, `VID`).
- **EID**: `keccak256(canonical_event_json)`.
- **VID**: `keccak256(evidence_bytes)` por cada artefacto ligado al evento.
- **Ciclo de vida**: `CREATED → ATTESTED → VERIFIED` (o `REJECTED`).
- **Roles**: `NOTARY` atestigua existencia/forma; `AUDITOR/COMPLIANCE` verifica cumplimiento/reglas.

## Flujo on-chain
```
createEvent(eid, eventType, payloadHash, vids)
  status = CREATED

attestEvent(eid)      // NOTARY or COMPLIANCE_ADMIN
  status = ATTESTED
  attestCount++

verifyEvent(eid)      // AUDITOR or COMPLIANCE_ADMIN, requires attestCount >= minAttestations
  verifyCount++
  status = VERIFIED when verifyCount >= minVerifications

rejectEvent(eid, reasonHash) // AUDITOR/COMPLIANCE_ADMIN, only if not VERIFIED
  status = REJECTED
```

## Parámetros de política
- `minAttestations` y `minVerifications` configurables (COMPLIANCE_ADMIN/DAO_COUNCIL).
- Rechazo solo permitido mientras el evento no sea VERIFIED.

## Esquema de evento canónico (off-chain)
```json
{
  "version": 1,
  "eventType": "CONSTRUCTION_PERMIT",
  "actorWallet": "0xabc...",
  "timestamp": "2026-01-27T00:00:00Z",
  "payloadHash": "0x9b71...",
  "vids": ["0xa1b2...", "0xc3d4..."],
  "jurisdiction": "MX-CMX",
  "nonce": null
}
```
- `canonicalizeEvent` → ordena claves y serializa sin espacios.
- `EID = keccak256(utf8(canonical_json))`
- `VID = keccak256(artifact_bytes)` por cada evidencia asociada.

## Ejemplos de evento
- **Permiso de construcción emitido**  
  `eventType=CONSTRUCTION_PERMIT`, `payloadHash=hash(pdf_permiso)`, `vids=[hash(dictamen_perito)]`.
- **Hito de obra 25% completado**  
  `eventType=PROJECT_MILESTONE_25`, `payloadHash=hash(reporte_fotografico)`, `vids=[hash(cert_supervision), hash(oracle_sensor)]`.

## Integraciones
- **EventGate**: `requireVerified(eid)` / `requireNotRejected(eid)` para operaciones críticas.
- **ComplianceGate.validateWithEvent(wallet, eid)**: aplica KYC/AML/credenciales + evento VERIFIED en una sola llamada.
- **Backend API**:
  - `POST /events` → calcula EID/VID, ancla con `createEvent`.
  - `POST /events/:eid/attest` → exige credencial NOTARY activa.
  - `POST /events/:eid/verify` → exige credencial AUDITOR activa.
  - `POST /events/:eid/reject` → razón hash.
  - `GET /events/:eid` → estado + logs JSONL.
- **Trazabilidad**: `backend/database/events_log.jsonl` + `StoryLedger.log_action("event", "...")`.

## Diagrama ASCII (resumido)
```
Off-chain payload -> payloadHash, VID[]
canonical_event_json -> EID
           |
           v
EventRegistry.createEvent (CREATED)
    | (NOTARY) attestEvent -> ATTESTED
    | (AUDITOR) verifyEvent -> VERIFIED
    | (AUDITOR) rejectEvent -> REJECTED
```
