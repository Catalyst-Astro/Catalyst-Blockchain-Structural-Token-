# Travel Rule Compliance Module (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Enable Travel Rule compliance by linking transfers to off-chain regulatory packages, without storing PII on-chain.

## How It Works
- Thresholds and rules live in TravelRuleConfigRegistry (versioned).
- Evidence hashes are stored in TravelRuleEvidenceRegistry.
- TravelRuleGate enforces evidence requirements based on policy.
- FractalToken calls the gate on transfers when enabled.

## Privacy
Only hashes and timestamps are recorded on-chain. PII remains off-chain.

## Integration
- STAR-04: ComplianceGate can remain the primary KYC gate.
- STAR-06: Risk scoring influences Travel Rule applicability.
- STAR-07: Monitoring alerts can trigger evidence collection.

## Flow (ASCII)
Transfer -> Evaluate -> Package -> Evidence -> Authorization

[Token] -> [TravelRuleGate] -> [Config + Evidence]

## Enforcement Modes (ASCII)
LOG_ONLY: allow without evidence
RESTRICT: require evidence exists (not rejected)
BLOCK   : require evidence VERIFIED
