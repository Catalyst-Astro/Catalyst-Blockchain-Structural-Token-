# Alert Severity and Response (Draft)

Disclaimer: Operational draft. Not legal advice.

## Severity Levels
- INFO: informational logging, no action required.
- WARNING: potential risk; apply tighter limits and review.
- CRITICAL: high confidence risk; restrict actions and escalate.

## Response Matrix
INFO:
  - Log and store evidence hash
  - No operational restrictions

WARNING:
  - Escalate risk level to reduce limits
  - Trigger compliance review

CRITICAL:
  - Escalate risk level to HIGH
  - Apply restrictive policy (no actions)
  - Initiate incident workflow
