# Attestation Format Specification (Draft)

Disclaimer: Operational draft. Not legal advice.

## JSON Fields (No PII)
- userTypeCode
- kycLevelCode
- jurisdictionCode (optional)
- validUntil
- flags (pepChecked, sanctionsChecked)
- issuerRef
- issuedAt

## Evidence
Hash the JSON payload and store the hash on-chain as `attestationHash`.
