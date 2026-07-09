# ANCHORING Module

## Principios
- Sin PII on-chain: solo hashes (EID/VID/RID/REPORT) y metadatos mínimos.
- Dos modos: anclaje directo (EvidenceAnchor) y anclaje por lote (Merkle root + pruebas off-chain).
- Roles: COMPLIANCE_ADMIN / AUDITOR pueden anclar y subir raíces.

## Flujos
```
[off-chain JSON/evidencia] --keccak--> hash (EID/VID/RID)
    |-- direct --> EvidenceAnchor.anchorHash(hash, type, refId)
    |-- batch  --> build_merkle_batch.ts -> root,batchId,proofs
                        |--> BatchRootRegistry.submitRoot(batchId, root)
```

- AnchorType: EVENT(0), EVIDENCE(1), REPORT(2), POLICY(3), OTHER(4).
- refId normalmente = EID asociado o id del reporte.

## Verificación
1) Directo: `EvidenceAnchor.exists(hash)` o GET `/verify/eid/:eid` / `/verify/vid/:vid` ? anchored=true, anchor metadata.
2) Por lote: buscar hash en `backend/database/batches/*.json`, tomar `root` y `proof`, validar Merkle con el mismo orden de hojas; opcionalmente confirmar `batchId` en BatchRootRegistry.

### Ejemplo de proof (pseudocode)
```
keccak(leaf0 || leaf1) = n01
keccak(n01 || leaf2)   = root
proof(leaf2) = [n01]
```

## Política de batching
- Recomendado: diario para EID de eventos y semanal para VID de documentos pesados.
- batchId = keccak256(root + timestamp + count) generado por `build_merkle_batch.ts`.
- Los proofs se guardan en `backend/database/batches/<batchId>.json`.

## Ejemplos
- EID (evento "Permiso de construcción emitido") = keccak256(canonical JSON del evento).
- VID (PDF escaneado) = keccak256(archivo binario).
- Reporte de auditoría: hash del PDF firmado ? AnchorType.REPORT, refId = reportHash.

## Integraciones
- AuditCheckpoint/AuditManager hacen anchoring best-effort al crear checkpoints o registrar reportes.
- API `/events` crea EID y puede anclarse luego.
- Script `backend/scripts/build_merkle_batch.ts` genera raíces y proofs listos para BatchRootRegistry.

## Diagramas ASCII
```
[actor] -> canonical JSON -> keccak256 -> EID
    -> EvidenceAnchor.anchorHash(EID, EVENT, EID)

[vids...] -> Merkle tree -> root
    -> BatchRootRegistry.submitRoot(batchId, root)
    -> store proofs off-chain
```
