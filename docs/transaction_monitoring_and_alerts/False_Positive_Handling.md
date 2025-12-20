# False Positive Handling (Draft)

Disclaimer: Operational draft. Not legal advice.

## Objective
Provide a consistent path to review and resolve alerts that are later deemed benign.

## Workflow
1) Flag the alert for review.
2) Collect evidence off-chain.
3) Record resolution hash on-chain when closing the alert.
4) Restore risk level to normal if appropriate.

## Controls
- All closures require COMPLIANCE_ADMIN approval.
- Resolutions must include a hash of the case record.
