# AML Risk Scoring and Limits (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Implement a risk-based AML/CTF framework that adapts operational limits and permissions based on dynamic risk scoring.

## On-Chain Components
- RiskScoreRegistry: Stores risk level and validity windows per wallet or entity (no PII).
- RiskPolicyRegistry: Versioned policies for limits and allowed actions per risk level.
- RiskEnforcement: Enforces policies at runtime and emits evidence events.
- FractalToken integration: Risk enforcement is applied during transfers (receive/transfer actions).

## Control Flow (ASCII)
Event -> Score -> Policy -> Enforcement

[Off-chain scoring] -> [RiskScoreRegistry]
        |                   |
        v                   v
  [RiskPolicyRegistry] -> [RiskEnforcement] -> [Token transfer/reward]

## Low vs High Risk (ASCII)
LOW  : action allowed + no caps
MED  : action allowed + quotas
HIGH : action blocked by policy

## Evidence
- Risk score events: RiskScoreSet / RiskScoreUpdated / RiskScoreExpired
- Policy events: RiskPolicyPublished / RiskPolicyActivated
- Enforcement events: QuotaConsumed

## Integration Checklist
1) Deploy RiskScoreRegistry and RiskPolicyRegistry.
2) Publish and activate policies per risk level.
3) Deploy RiskEnforcement and grant ENFORCER_ROLE to the token.
4) Set RiskEnforcement in FractalToken and enable risk limits.
5) (Optional) Set EntityRegistry for corporate aggregation.

## Notes
- No PII is stored on-chain; only hashes and status metadata.
- Scores must be refreshed on schedule or after trigger events.
