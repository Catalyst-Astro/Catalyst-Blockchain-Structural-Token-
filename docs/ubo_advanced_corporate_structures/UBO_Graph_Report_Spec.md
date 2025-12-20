# UBO Graph Report Spec (Draft)

Disclaimer: Operational draft. Not legal advice.

## JSON Fields
- entityId: bytes32 (hex string)
- generatedAt: ISO timestamp
- validFrom: ISO timestamp
- validTo: ISO timestamp or null
- jurisdictionCode: string (e.g., "MX")
- entityType: string (e.g., "SA_DE_CV")
- nodes: list of entities or persons (off-chain only)
- edges: ownership/control relationships
- uboSummary: list of UBOs with ownership/control basis

## Hashing
- Canonical JSON serialization.
- Hash using keccak256.
- Store only the hash on-chain.
