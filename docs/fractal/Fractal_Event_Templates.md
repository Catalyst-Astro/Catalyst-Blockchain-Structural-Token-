# Fractal Event Templates

## Fases y eventos
- Fase 1: LAND_ACQUISITION, SPV_FORMATION
- Fase 2: ZONING_PERMIT, CONSTRUCTION_LICENSE, ENV_CLEARANCE
- Fase 3: INVESTOR_ONBOARDING, CAPITAL_INFLOW
- Fase 4: MILESTONE_10, MILESTONE_25, MILESTONE_50, MILESTONE_75, MILESTONE_100
- Fase 5: UNIT_REGISTRATION, LEASE_SIGNED, SALE_SIGNED, YIELD_DISTRIBUTION

## Template fields
- eventType
- requiredVIDs (min evidencias)
- requiredAttestors (roles: NOTARY)
- requiredVerifiers (AUDITOR/COMPLIANCE)
- riskClass (LOW/MED/HIGH)
- policyRefs (pid or doc)

## Ejemplo (ZONING_PERMIT)
```
{
  "eventType": "ZONING_PERMIT",
  "requiredVIDs": ["permit_pdf_hash"],
  "requiredAttestors": ["NOTARY"],
  "requiredVerifiers": ["AUDITOR"],
  "riskClass": "MED",
  "policyRefs": ["zoning-v1"]
}
```

## Quórum sugerido por riesgo
- LOW: 1 attestation, 1 verification
- MED: 2 attestations, 1 verification
- HIGH: 2 attestations, 2 verifications

## Uso
- Builder valida que payload + evidencias cumplan template.
- EID se calcula canónicamente; mismo payload ? mismo EID.
