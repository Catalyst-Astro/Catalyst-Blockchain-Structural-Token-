# NATURALEZA_JURIDICA_TOKEN Module

Disclaimer: This module is a legal-tech operational draft. It is not legal advice and does not guarantee compliance.

## Purpose
Define Fractal Token as an economic rights instrument (RWA) and enforce controls that reduce the risk of being treated as currency, a general payment instrument, or a public offering without compliance.

## Risks Mitigated
- Misclassification as currency or payment instrument.
- Unauthorized transfers outside verified participants.
- Public offering messaging or implied guaranteed returns.
- Lack of auditable evidence of disclosures.

## On-Chain Components
- `DisclosureRegistry.sol`: versioned disclosure bundle hashes.
- `AcceptanceRegistry.sol`: wallet acceptance of the active disclosure.
- `TokenUsePolicy.sol`: policy flags for transfer rules and jurisdiction.
- `FractalToken.sol`: enforcement hooks for disclosures, whitelist, jurisdiction, lockups, and purpose.

## Recommended Tree
```
contracts/
  DisclosureRegistry.sol
  AcceptanceRegistry.sol
  TokenUsePolicy.sol
  FractalToken.sol
  interfaces/
    IDisclosureRegistry.sol
    IAcceptanceRegistry.sol
    ITokenUsePolicy.sol
    IWhitelistRegistry.sol
docs/naturaleza_juridica_token/
  Token_Nature_Module.md
  Token_Legal_Classification.md
  Disclosures_Risk_Warnings.md
  Terms_Of_Use_Token.md
  Private_Offering_Notice.md
  Investor_Suitability_Policy.md
  Token_Spec_Summary.md
  Operational_Model.md
test/
  naturaleza_juridica_token.spec.ts
```

## Off-Chain Processes
See `Operational_Model.md` for classification, acceptance workflow, suitability, and marketing controls.

## Flow Summary
1) Publish disclosure bundle hash and activate version.
2) User accepts active disclosure (wallet signature).
3) Token transfers enforce acceptance and policy rules.
4) Audit trail exists via on-chain events and hashes.
5) When payment restriction is active, transfers must include an approved purpose hash.

## Configuration Note
Enforcement in `FractalToken` starts disabled so the initial mint can succeed. After setting registries and policy addresses, call `setEnforcementEnabled(true)`.

## Evidence
- DisclosurePublished / DisclosureActivated events.
- DisclosureAccepted events.
- PolicyUpdated events.

## ASCII Diagrams

Publication
```
Compliance Admin -> DisclosureRegistry.publishDisclosure(hash)
Compliance Admin -> DisclosureRegistry.activateDisclosure(version)
```

Acceptance
```
Wallet -> AcceptanceRegistry.acceptActiveDisclosure()
AcceptanceRegistry -> event DisclosureAccepted(wallet, version)
```

Transfer Enforcement
```
Transfer -> FractalToken._beforeTokenTransfer()
  -> policy flags
  -> disclosure acceptance
  -> whitelist/jurisdiction/lockup
  -> allowed purpose (if restricted)
```
