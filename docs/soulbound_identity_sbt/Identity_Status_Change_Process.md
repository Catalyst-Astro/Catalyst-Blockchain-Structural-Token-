# Identity Status Change Process (Draft)

Disclaimer: Operational draft. Not legal advice.

## Suspension
1) Triggered by monitoring alerts or compliance review.
2) COMPLIANCE_ADMIN suspends identity with reason hash.
3) Access is blocked until renewal or reactivation.

## Revocation
1) Triggered by severe compliance breach.
2) COMPLIANCE_ADMIN revokes identity with reason hash.
3) Access remains blocked unless re-minted by compliance.

## Renewal
1) New attestation generated off-chain.
2) IDENTITY_MINTER renews identity with updated validity.
