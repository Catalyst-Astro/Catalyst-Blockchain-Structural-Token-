# POLICY Governance Module

- Contract: `PolicyRegistry` stores versioned policy hashes (pid) with activation.
- pid = keccak256(policyHash + activeFrom).
- Roles: `COMPLIANCE_ADMIN`/`DAO_COUNCIL` register; `DAO_COUNCIL` activates.
- Anchoring: optional EvidenceAnchor as POLICY type.
- Active policy tracked via `activePolicyPid`; `getActivePolicy()` returns struct.

## Off-chain publish
- Use `backend/scripts/publish_policy.ts` to read `policies/current_policy.json`, compute hash, register & activate.
- Manifest saved under `policies/published/<pid>.json`.

## Recommended fields in policy JSON
- aml: {maxRiskLevel}
- identity: {requiredCredentialRole}
- events: {minAttestations, minVerifications}
- ramp: {maxPerTx, dailyLimit, cooldown}
- batching: {frequency}
