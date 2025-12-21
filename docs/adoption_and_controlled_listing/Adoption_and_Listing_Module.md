# Adoption and Listing Module (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Define how Catalyst introduces tokens to the market in phases with controlled listing and compliant secondary market access.

## Components
- ListingPolicyRegistry: listing phases, caps, and venue approvals.
- TransferRestrictionEngine: enforces listingRequired when active.

## Phase flow (ASCII)
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3

## Listing enforcement (ASCII)
Transfer -> Restriction engine -> Listing policy -> Allow or Block

## Audit trail
- Policy hashes and versions.
- Venue approvals and revocations.
- Transfer blocked events with reason codes.

## Dependencies
- STAR-03 Private Offering
- STAR-04 KYC/AML
- STAR-06 Risk Scoring
- STAR-07 Monitoring
- STAR-08 Travel Rule
- STAR-09 Whitelist
- STAR-10 Identity SBT
- STAR-11 Transfer Restrictions
- STAR-12 Freeze

