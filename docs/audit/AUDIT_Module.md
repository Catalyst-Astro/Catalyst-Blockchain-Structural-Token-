# AUDIT Module (Hallazgos ? Reportes ? Anclaje)

## Componentes
- `AuditReportRegistry`: registra reportes firmados (RID), periodo y batchId; permite deprecarlos; integra opcionalmente `EvidenceAnchor`.
- `EvidenceAnchor`: ancla REPORT/EVIDENCE hashes.
- `auditor/findings.ts`: genera FID = keccak(canonical_finding) y escribe JSONL.
- `backend/scripts/generate_audit_report.ts`: compila findings ? CSV, calcula `reportHash`, `rid`, firma (mock) y opcionalmente registra en cadena.
- `backend/listeners/audit_indexer.ts`: escucha eventos on-chain y guarda JSONL (events, anchors, reports).

## Identificadores
- `FID` = keccak(canonical finding json).
- `VID` = hash de artefacto evidencial.
- `RID` = keccak(reportHash + periodHash + batchId).

## Flujo
```
findings.jsonl --(generate_audit_report)--> CSV + hash
    -> RID -> AuditReportRegistry.registerReport
    -> EvidenceAnchor.anchorHash(reportHash, REPORT, rid)
```

## Ejemplo de finding (canonizado)
```
{
  "ruleId": "risk_mismatch",
  "severity": "HIGH",
  "wallet": "0x...",
  "description": "Risk score above threshold",
  "createdAt": "2026-01-27T00:00:00Z"
}
```

## API sugerida
- `GET /audit/reports/:rid` (indexer JSONL)
- `GET /audit/anchors/:hash`
- `GET /audit/findings?eid=...` (filtro sobre findings.jsonl)

## Garantías
- Solo rol `AUDITOR` registra reportes; `COMPLIANCE_ADMIN` puede deprecarlos.
- Hashes de reportes anclados para no repudiar.
- Versionado mediante `ReportDeprecated(rid, replacedByRid)`.
