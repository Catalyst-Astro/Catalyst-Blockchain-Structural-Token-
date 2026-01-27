# Observabilidad, Incidentes y WORM

## Logs unificados
- Schema en `backend/observability/log_schema.ts`.
- Campos: timestamp, level, domain, correlationIds {eid, vid, rid, batchId, iid}, message, dataHash.
- Persistencia: `backend/database/logs/system.jsonl` (no PII).

## Incidentes
- Manager en `backend/incidents/incident_manager.ts`.
- IID = keccak(canonical incident json). Acciones: `createIncident`, `closeIncident`.
- Severidad HIGH/CRITICAL debe detonar hallazgo/alerta (extensible).

## WORM Store
- `backend/storage/worm_store.ts`: guarda artefactos en `backend/storage/worm/<vid>` + manifest JSON.
- VID = keccak256(buffer). Si existe, no sobreescribe.
- Pensado para vincular con EvidenceAnchor (EVIDENCE) si se desea.
