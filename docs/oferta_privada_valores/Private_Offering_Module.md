# OFERTA_PRIVADA_VALORES Module

Disclaimer: Operational draft. Not legal advice.

## Purpose
Operationalize a private offering of Fractal Token economic rights with eligibility, jurisdiction, and transfer restrictions. The module is designed to support Mexican LMV, Reg D, Reg S, and investor protection principles.

## What is a Private Offering
A private offering limits distribution to verified eligible investors, avoids public solicitation, and enforces transfer restrictions to prevent public distribution.

## Implementation in Catalyst
On-chain registries store offering data and investor eligibility. Transfers are restricted by lockups, jurisdiction checks, and eligibility checks.

## Flow Overview
1) Create offering + document hashes.
2) Approve eligible investors.
3) Distribute tokens via primary allocation.
4) Enforce lockups and controlled secondary transfers.

## Risks Mitigated
- Public offering classification.
- Unauthorized secondary distribution.
- Jurisdictional and investor suitability breaches.

## ASCII Diagrams

Investor Onboarding
```
Investor -> Off-chain KYC/AML -> Eligibility Registry (approve)
Investor -> Accept PPM + Subscription -> Document hashes anchored
```

Primary Issuance
```
Issuer -> PrivateOfferingRegistry (active offering)
Issuer -> Token mint/transfer -> Eligibility + Jurisdiction checks
```

Secondary Transfer Control
```
Seller -> Transfer
  -> Eligibility check (sender + receiver)
  -> Jurisdiction check
  -> Lockup check
  -> Allow or Revert
```
