# Token Specification Summary (Draft)

Disclaimer: Operational draft. Not legal advice.

## Legal-Tech Summary
- Token represents an economic right to distributions from trust-held assets.
- Not a currency or general payment instrument.
- Transfers restricted by compliance checks and disclosures acceptance.

## Technical Summary
- ERC20 compatible token with compliance enforcement hooks.
- DisclosureRegistry stores versioned disclosure bundle hashes.
- AcceptanceRegistry records wallet acceptance of active disclosures.
- TokenUsePolicy manages policy flags and allowed jurisdictions.

## Key Enforcement Rules
- Transfer only if disclosure acceptance is current.
- Optional whitelist and jurisdiction checks.
- Optional lockups and purpose-based transfer restrictions.
