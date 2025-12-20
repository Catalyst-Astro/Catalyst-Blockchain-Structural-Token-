# TravelRulePackage Specification (Draft)

Disclaimer: Operational draft. Not legal advice.

## TravelRulePackage.json (Minimal Set)
- originator_id_ref
- beneficiary_id_ref
- originator_wallet
- beneficiary_wallet
- amount
- asset_type
- timestamp
- jurisdiction_origin
- jurisdiction_beneficiary
- tx_hash
- purpose_code (optional)
- risk_context (score + flags)

## Evidence Hash
Compute a SHA-256 or keccak256 hash of the JSON payload and store it on-chain.
