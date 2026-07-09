---
id: ZK-VAL-001
domain: VAL
kind: TRACE
layer: L2-L7
nt_refs:
  - REQ-VAL-001
  - CTR-VAL-001
  - CMP-DEPLOY-001
  - ART-DEPLOY-TS-001
  - ART-CONTRACT-PRJ-001
  - ART-CONTRACT-VL-001
  - ART-CONTRACT-TRY-001
  - ART-CONTRACT-SL-001
  - TST-DEPLOY-001
  - MET-DEPLOY-001
  - EVD-DEPLOY-001
artifact_refs:
  - scripts/deploy_value_engine.ts
  - contracts/ProjectRegistry.sol
  - contracts/ValuationLedger.sol
  - contracts/Treasury.sol
  - contracts/SettlementLog.sol
test_refs:
  - docs/clockchain/ntx/40_traces.ntx#TR-VAL-001
metric_refs:
  - MET-DEPLOY-001
evidence_refs:
  - EVD-DEPLOY-001
conflicts: []
---

# ZK-VAL-001

El dominio `VAL` modela el despliegue y registro del value engine como una traza completa: requisito, contrato, artefactos, smoke test y evidencia de salida.

## Lectura rápida

- Núcleo causal: `REQ-VAL-001 -> CTR-VAL-001`.
- Implementación: script de deploy y contratos de registro, valuación, tesorería y settlement.
- Salida esperada: addresses válidas y evidencia de despliegue rastreable.
