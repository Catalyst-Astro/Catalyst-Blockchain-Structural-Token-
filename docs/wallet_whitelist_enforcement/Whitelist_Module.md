# Wallet Whitelist Enforcement Module (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Ensure only authorized wallets can interact with tokens, distributions, and critical operations.

## Core Components
- WhitelistRegistry: approves, suspends, revokes wallets with audit events.
- WhitelistPolicy: versioned conditions for disclosures, AML, risk, eligibility, and Travel Rule.
- EnforcementHooks: reusable modifiers/helpers.
- FractalToken integration: whitelist policy enforcement on transfer hooks.

## Flow (ASCII)
KYC -> Disclosures -> Eligibility -> Whitelist -> Transfer

[User] -> [WhitelistRegistry] -> [Token Transfer]

## Suspension Flow (ASCII)
Alert -> Suspend -> Block -> Review -> Reactivate

## Evidence
- WalletApproved / WalletSuspended / WalletRevoked / WalletReactivated
- Policy published + activated with hashes
