# Limits and Thresholds Spec (Draft)

Disclaimer: Operational draft. Not legal advice.

## Action Bitmask
Actions are encoded as flags:
- ACTION_RECEIVE  = 1 << 0
- ACTION_TRANSFER = 1 << 1
- ACTION_CLAIM    = 1 << 2
- ACTION_VOTE     = 1 << 3
- ACTION_STAKE    = 1 << 4

## Policy Fields
- maxAmountPerPeriod: cap per period (0 = no cap).
- maxTxPerPeriod: transaction count cap per period (0 = no cap).
- periodSeconds: rolling window size in seconds (0 = all-time).
- allowedActions: bitmask of permitted actions.
- policyHash: hash of the off-chain policy document.

## Example Policies
LOW:
  maxAmountPerPeriod = 0
  maxTxPerPeriod = 0
  allowedActions = RECEIVE | TRANSFER

MEDIUM:
  maxAmountPerPeriod = 100,000 tokens / 30 days
  maxTxPerPeriod = 20
  allowedActions = RECEIVE | TRANSFER | CLAIM

HIGH:
  allowedActions = 0 (block)
