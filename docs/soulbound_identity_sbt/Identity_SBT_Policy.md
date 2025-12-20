# Identity SBT Policy (Draft)

Disclaimer: Operational draft. Not legal advice.

## Objective
Grant access to ecosystem functions only to wallets with a valid identity SBT.

## Status Rules
- ACTIVE: valid for access until expiration.
- SUSPENDED: blocked due to compliance risk.
- REVOKED: permanently blocked.
- EXPIRED: validity window passed.

## Governance
- IDENTITY_MINTER mints/renews based on compliance approvals.
- COMPLIANCE_ADMIN can suspend or revoke with reason hash.
- DAO_COUNCIL activates policy versions.
