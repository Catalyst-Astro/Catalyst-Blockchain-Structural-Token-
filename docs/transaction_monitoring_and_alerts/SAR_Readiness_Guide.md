# SAR/ROS Readiness Guide (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Prepare evidence for suspicious activity reports (SAR/ROS) without storing PII on-chain.

## Evidence Components
- Alert identifiers and timestamps.
- Rule hashes and version IDs.
- Off-chain investigation notes (hashed).
- Risk score changes and validity windows.
- Action logs (auto-actions, manual overrides).

## Recommended Archive Pack
- Alert export (JSON) with hash.
- Rule configuration snapshots (hashes).
- Case resolution memo (hash).
