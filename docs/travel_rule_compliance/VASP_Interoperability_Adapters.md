# VASP Interoperability Adapters (Draft)

Disclaimer: Operational draft. Not legal advice.

## Goal
Support integration with Travel Rule providers (TRISA, Notabene, or others) via off-chain adapters.

## Adapter Responsibilities
- Send/receive TravelRulePackage.json over secure channels.
- Verify counterparty identity and VASP status.
- Store delivery receipts and status hashes.
- Update TravelRuleEvidenceRegistry with status changes.

## Evidence
Adapter logs should be hashed and referenced in TravelRule evidence records.
