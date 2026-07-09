---
id: ZK-KRN-001
domain: KRN
kind: KERNEL
layer: L0-L7
nt_refs:
  - REQ-KRN-001
  - DEC-KRN-001
  - CTR-KRN-001
  - CMP-KRN-001
  - ART-KRN-KERNEL-TS-001
  - TST-KRN-001
  - MET-KRN-001
  - EVD-KRN-001
artifact_refs:
  - backend/api/ai/decisionKernel.ts
  - backend/api/ai/controlPlane.ts
  - apps/catalyst-gui/src/pages/OperatorInbox.tsx
test_refs:
  - test/clockchain_operator_ai.spec.ts
metric_refs:
  - MET-KRN-001
evidence_refs:
  - EVD-KRN-001
conflicts: []
---

# ZK-KRN-001

`KRN` formaliza el nucleo de pensamiento atemporal-anacronico del operador Clockchain. La decision no nace de un solo paso ni de un solo centro: se compone con taxonomia, rutas restrictivas ZK/NTX y una interseccion radial entre `EP`, `ARCH`, `QA`, `RISK`, `OPS` y `POL`.

## Nucleo

- Toda decision debe poder volver a `ZK -> NTX -> runtime -> evidence`.
- El caso no se clasifica solo por dominio; tambien por continuidad, conflicto, reversibilidad y calidad de evidencia.
- Las rutas de live execution se bloquean si el factor taxonomico cae en `broken`, `blocked` o sin aprobacion AX12.

## Factor taxonomico

`T = {domain, intent, severity, basePolicyClass, reversibility, evidenceScore, conflictState, continuityState, nodeKinds, layerFocus}`

Este factor gobierna la degradacion de decision:

- `read_only` si el caso solo observa.
- `propose_only` si la continuidad o el conflicto rompen la ruta.
- `reversible_execute` si la ruta esta completa y la mutacion es reversible.
- `irreversible_execute` solo con continuidad completa y policy compatible con AX12.

## Radialidad policentrica

- `EP`: exige fundamento ZK/NTX.
- `ARCH`: exige continuidad entre `REQ`, `CTR` y artefactos.
- `QA`: exige `TST` y `MET`.
- `RISK`: eleva o restringe segun severidad y contradicciones.
- `OPS`: exige continuidad operativa hasta evidencia.
- `POL`: impone aprobacion humana cuando la accion es irreversible.

## Resultado operativo

El operador IA persiste este kernel en casos, planes y reportes para que la toma de decisiones quede explicable y auditable sin romper la capa runtime existente.
