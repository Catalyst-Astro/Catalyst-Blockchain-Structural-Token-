---
id: ZK-RMP-001
domain: RMP
kind: TRACE
layer: L2-L7
nt_refs:
  - REQ-RMP-001
  - DEC-RMP-001
  - CTR-RMP-001
  - CMP-RMP-001
  - ART-RMP-SERVER-TS-001
  - ART-IDC-STORY-TS-001
  - TST-RMP-001
  - MET-RMP-001
  - EVD-RMP-001
artifact_refs:
  - backend/api/server.ts
  - backend/api/storyLedger.ts
  - docs/ramp/RAMP_Module.md
test_refs:
  - test/clockchain_trace_runtime.spec.ts
metric_refs:
  - MET-RMP-001
evidence_refs:
  - EVD-RMP-001
conflicts: []
---

# ZK-RMP-001

`RMP` enlaza solicitud, confirmación y settlement usando `eid` como ancla principal y `confirmationVID` como evidencia de continuidad cuando no se provee un `traceId` explícito.

## Lectura rápida

- Núcleo causal: `REQ-RMP-001 -> CTR-RMP-001`.
- Implementación: rutas `cash-in/out` y anclaje opcional en `EvidenceAnchor`.
- Evidencia: `ramps_log.jsonl`, `evidence_log.jsonl` y narrativa operacional persistida.
