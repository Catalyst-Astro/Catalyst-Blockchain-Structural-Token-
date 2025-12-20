# Transaction Monitoring and Alerts (Draft)

Disclaimer: Operational draft. Not legal advice.

## Purpose
Monitor on-chain activity for unusual patterns, generate alerts with severity, and trigger proportional actions.

## Components
- MonitoringConfigRegistry: Rule hashes, severity, thresholds by risk/jurisdiction.
- AlertRegistry: Stores alerts (no PII) and their lifecycle.
- AutoActionPolicy: Maps severity to automated actions.
- Integration: Alerts can escalate risk levels to influence RiskEnforcement policies.

## End-to-End Flow (ASCII)
Event -> Rule -> Alert -> Action

[Indexer] -> [MonitoringConfigRegistry]
     |            |
     v            v
  [AlertRegistry] -> [AutoActionPolicy] -> [RiskScoreRegistry] -> [RiskEnforcement]

## Severity Comparison (ASCII)
INFO    : log only
WARNING : risk level escalates (limits reduced)
CRITICAL: risk escalates to high (actions blocked via policy)

## Evidence
- RulePublished / RuleActivated
- AlertRaised / AlertClosed
- AutoActionExecuted

## Integration Notes
- Alerts can be ingested from a rule engine off-chain.
- Auto-actions update risk scores with validity windows.
- Freeze behavior can be implemented by setting HIGH risk policy with no allowed actions.
