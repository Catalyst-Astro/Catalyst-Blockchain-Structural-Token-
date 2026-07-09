---
id: ZK-EVT-001
domain: EVT
kind: TRACE
layer: L2-L7
nt_refs:
  - REQ-EVT-001
  - DEC-EVT-001
  - CTR-EVT-001
  - CMP-EVT-001
  - ART-EVT-CANON-TS-001
  - TST-EVT-001
  - MET-EVT-001
  - EVD-EVT-001
artifact_refs:
  - backend/src/events/canonical.ts
  - backend/api/server.ts
  - docs/events/EVENTS_Module.md
test_refs:
  - test/clockchain_trace_runtime.spec.ts
metric_refs:
  - MET-EVT-001
evidence_refs:
  - EVD-EVT-001
conflicts: []
---

# ZK-EVT-001

`EVT` convierte el evento canónico en unidad causal: `payloadHash`, `VID[]`, `EID` y metadata Zettelkasten opcional sin romper compatibilidad legacy cuando esos campos no se envían.

## Lectura rápida

- Núcleo causal: `REQ-EVT-001 -> CTR-EVT-001 -> ART-EVT-CANON-TS-001`.
- Verificación: metadata ordenada y persistida en logs del backend.
- Evidencia: `events_log.jsonl` y resumen de cobertura del validador NTX.
