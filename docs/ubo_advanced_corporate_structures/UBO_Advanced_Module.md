# UBO_ADVANCED_CORPORATE_STRUCTURES Module

Disclaimer: Operational draft. Not legal advice.

## Purpose
Model complex corporate ownership structures, identify UBOs, and anchor evidence on-chain without storing PII.

## On-chain Components
- `EntityRegistry.sol`: corporate entity registry and wallet linkage.
- `UBOGraphRegistry.sol`: versioned UBO graph report hashes.
- `UBOAttestationRegistry.sol`: verification attestations and high-risk flag.
- `UBOComplianceGate.sol`: enforcement gate for corporate wallets.

## Flow Overview
1) Register entity and link operational wallet.
2) Submit UBO graph hash and activate version.
3) Attest UBO verification and set risk flags.
4) Enforce gate for transfers/distributions.

## ASCII Diagrams

Ownership Chain -> UBO
```
Holding Co -> Sub Co -> Op Co -> UBO
```

Trust Structure -> UBO
```
Trust -> Trustee -> Beneficiary -> UBO
```

Capture -> Hash -> Activation -> Enforcement
```
Collect docs -> Build graph -> Hash -> UBOGraphRegistry.activate
Token transfer -> UBOComplianceGate.validateWallet
```
