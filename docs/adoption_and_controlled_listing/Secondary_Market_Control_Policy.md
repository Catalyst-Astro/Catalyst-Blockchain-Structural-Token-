# Secondary Market Control Policy (Draft)

Disclaimer: Operational draft. Not legal advice.

## Scope
Applies only after Phase 2 activation.

## Controls
- Whitelisted venues and wallets only.
- Volume and frequency caps per period.
- Lockups enforced by series and investor type.
- Risk based restrictions via AML scoring.
- Travel rule evidence required when thresholds apply.

## Enforcement
- TransferRestrictionEngine validates policy gates.
- ListingPolicyRegistry enforces caps and venue approvals.
- FreezeRegistry overrides all transfers.

## Exceptions
- DAO_COUNCIL approval required.
- caseId and reasonHash recorded off chain.

## Audit signals (ASCII)
Transfer -> Policy checks -> Allowed or Blocked -> Event log
