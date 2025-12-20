# KYC_AML_COMPLIANCE Module

Disclaimer: Operational draft. Not legal advice.

## Obligations Covered
- Mexico LFPIORPI.
- FATF/GAFI recommendations.
- FinCEN (US) and MiCA (EU) principles where applicable.

## Data Handling
- Off-chain: identity documents, biometric checks, sanctions screening, UBO declarations.
- On-chain: hashes of verified identity, UBO declaration hashes, AML status, risk level.
- No personal data stored on-chain.

## On-Chain Components
- `IdentityRegistry.sol`: verified identity hash + AML status.
- `UBORegistry.sol`: UBO declaration hashes for corporate wallets.
- `AMLScoringRegistry.sol`: AML risk level storage.
- `ComplianceGate.sol`: enforcement gate used by token transfers.

## Audit Response
- Provide on-chain event logs.
- Provide off-chain evidence matching anchored hashes.

## ASCII Diagrams

Identity Verification
```
User -> Off-chain KYC -> IdentityRegistry.verifyIdentity(hash)
User -> Risk Scoring -> AMLScoringRegistry.assignRisk(level)
```

UBO Declaration
```
Entity -> Off-chain UBO -> UBORegistry.declareUBO(hash)
```

Transfer Enforcement
```
Token Transfer -> ComplianceGate.validate(wallet)
  -> KYC verified
  -> risk <= threshold
  -> allow or revert
```
