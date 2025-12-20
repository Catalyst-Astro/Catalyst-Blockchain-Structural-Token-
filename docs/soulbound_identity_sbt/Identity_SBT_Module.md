# Soulbound Identity SBT Module (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Represent verified KYC/AML identity as a non-transferable token that gates access without storing PII.

## Core Components
- CatalystIdentitySBT: soulbound ERC-721 identity token.
- IdentityPolicyRegistry: versioned rules for KYC levels and user types.
- IdentityGates: reusable checks for transfers, claims, and votes.

## Flow (ASCII)
Off-chain KYC -> Attestation Hash -> SBT Mint -> Access

[KYC] -> [Attestation JSON] -> [SBT Mint] -> [Token / DAO / Rewards]

## Privacy
Only attestation hashes and minimal attributes are stored on-chain.
