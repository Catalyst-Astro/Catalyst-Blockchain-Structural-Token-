---
id: ZK-IDC-001
domain: IDC
kind: TRACE
layer: L2-L7
nt_refs:
  - REQ-IDC-001
  - DEC-IDC-001
  - CTR-IDC-001
  - CMP-IDC-001
  - ART-IDC-SERVER-TS-001
  - ART-IDC-STORY-TS-001
  - TST-IDC-001
  - MET-IDC-001
  - EVD-IDC-001
artifact_refs:
  - backend/api/server.ts
  - backend/api/storyLedger.ts
  - docs/identity_roles/IDENTITY_ROLES_Module.md
test_refs:
  - test/clockchain_trace_runtime.spec.ts
metric_refs:
  - MET-IDC-001
evidence_refs:
  - EVD-IDC-001
conflicts: []
---

# ZK-IDC-001

`IDC` cubre identidad, credenciales y scoring AML como narrativa causal persistente. La prioridad es que cada acción crítica deje contexto suficiente para enlazarla con requisito, contrato y evidencia.

## Lectura rápida

- Núcleo causal: `REQ-IDC-001 -> CTR-IDC-001`.
- Implementación: rutas de backend y `StoryLedger`.
- Evidencia: JSONL append-only y ledger narrativo con `traceId`, `reqId`, `ctrId`, `zkRefs` y `evidenceRefs`.
