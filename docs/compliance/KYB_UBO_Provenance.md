# KYB/UBO + Provenance

## Objetivo
Asegurar que wallets corporativas tengan declaración UBO y KYB trazables sin PII on-chain, y que el scoring AML sea defendible mediante hashes anclados.

## Componentes
- `EntityRegistry`: clasifica wallets (INDIVIDUAL/CORPORATE), permite crear entityId y vincular wallets legacy.
- `UBORegistry`: guarda uboDeclarationHash por wallet (sin PII), con issuer y updatedAt.
- `ComplianceGate`: si `entityType == CORPORATE` exige `uboHash != 0`, además de KYC + AML + credenciales.
- `AMLScoringRegistry`: almacena nivel de riesgo.
- `EvidenceAnchor`: ancla provenanceHash del cálculo AML (AnchorType.OTHER, refId=hash(wallet)).

## Flujo
```
KYB packet (off-chain) --keccak--> uboHash
COMPLIANCE_ADMIN declareUBO(wallet, uboHash)
EntityRegistry.setEntityType(wallet, CORPORATE)
AML scoring input --canonical+keccak--> provenanceHash
AMLScoringRegistry.updateRisk(wallet, level)
EvidenceAnchor.anchorHash(provenanceHash, OTHER, keccak(wallet))
ComplianceGate.validate(wallet)
```

## Payloads (canonizados antes de hashear)
- KYB/UBO packet: `{version, entityName, jurisdiction, owners:[{percent, role}], timestamp}` ? uboHash.
- AML scoring input: `{version, model, inputs:{jurisdiction, pep, sanctions, txVolume}, timestamp}` ? provenanceHash.

## API
- `POST /aml/score` ? guarda JSONL (`aml_scoring_log.jsonl`), ancla provenanceHash y actualiza AMLScoringRegistry.
- `GET /verify/eid/:eid` / `GET /verify/vid/:vid` ? confirma anclaje y batch.

## Diagramas
```
[wallet:corp] --declareUBO--> UBORegistry (hash only)
[wallet:corp] --setEntityType(CORPORATE)--> EntityRegistry
              --AML score--> AMLScoringRegistry & EvidenceAnchor (provenance)
ComplianceGate.validate: KYC + AML + (if corporate) UBO present
```

## Políticas sugeridas
- Sin UBO declarado => corporativo bloqueado.
- Riesgo AML HIGH sólo permitido si DAO_COUNCIL relaja política.
- Renovar UBO hash al menos anual; cada renovación = nuevo hash anclado.
