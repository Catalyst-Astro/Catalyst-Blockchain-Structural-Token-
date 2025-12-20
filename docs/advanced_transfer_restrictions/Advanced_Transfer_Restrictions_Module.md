# Advanced Transfer Restrictions Module (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Apply advanced transfer restrictions for RWA tokens based on series, lockups, jurisdiction, eligibility, and compliance.

## Components
- SeriesRegistry: series metadata, status, and policy version per project.
- LockupRegistry: series and wallet lockups.
- JurisdictionRegistry: wallet jurisdiction codes (no PII).
- JurisdictionPolicyRegistry: allow/deny rules per series and policy version.
- TransferRestrictionEngine: executes cascading checks.

## Flow (ASCII)
Transfer -> Identity -> Disclosures -> Eligibility -> Lockup -> Jurisdiction -> Risk -> Travel Rule

## Series Comparison (ASCII)
FRA-CAB-001: 180d lockup, MX only
FRA-CAB-002: 90d lockup, MX + US
