# Selective Freeze and Legal Orders Module (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Enable selective freezes (wallet, series, function) with audit trails, legal order handling, and controlled unfreeze.

## Components
- FreezeRegistry: stores freezes and evidence hashes.
- FreezePolicyRegistry: versioned rules for freeze types and limits.
- EmergencyMode: time-bound emergency activation.
- FreezeEnforcement: reusable checks for token/claim/governance gates.

## Flow (ASCII)
Alert -> Freeze -> Review -> Unfreeze

Critical Alert -> Freeze Wallet -> Compliance Review -> Resolution

Legal Order -> Freeze Series -> DAO Ratification -> Resolution
