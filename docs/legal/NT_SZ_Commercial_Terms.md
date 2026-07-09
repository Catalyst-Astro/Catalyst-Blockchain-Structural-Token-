# NT-SZ Commercial Terms (MSA + Order Form Template)

Version: v0.1  
Status: Draft template  
Last updated: 2026-02-22  
Scope: Clockchain NeuroTrace-SZ (NT-SZ) commercial operation in this repository.

> Important: This is an operational legal template, not legal advice.  
> Validate with licensed counsel before signature or external use.

## 1. Template Usage

1. Replace all placeholders in brackets, for example `[PROVIDER_LEGAL_NAME]`.
2. Complete Annex A (Order Form) with price, SLA, and scope.
3. If personal data is processed, attach a signed DPA annex.
4. Sign Section 20 and Annex A.

## 2. Parties

This Master Service Agreement ("MSA") is entered into by and between:

- Provider: `[PROVIDER_LEGAL_NAME]`, with address `[PROVIDER_ADDRESS]`.
- Customer: `[CUSTOMER_LEGAL_NAME]`, with address `[CUSTOMER_ADDRESS]`.
- Effective date: `[YYYY-MM-DD]`.

## 3. Definitions

- "NT-SZ": Clockchain NeuroTrace-SZ specification, tooling, and associated service model.
- "Open Source Components": code and assets distributed under repository open-source license terms.
- "Commercial Services": paid support, certification, managed telemetry, integrations, training, or managed deployment.
- "Order Form": signed commercial annex defining price, term, and service scope.
- "Production Environment": any environment serving real users, real funds, or regulated operations.
- "Value Flow": monthly USD-equivalent value tracked for variable fee calculation, if applicable.

## 4. Scope and Precedence

1. This MSA governs Commercial Services and any paid NT-SZ operation rights.
2. Open Source Components remain governed by their stated open-source licenses (for example Apache-2.0).
3. If an Order Form conflicts with this MSA on commercial variables (price, term, SLA), the signed Order Form prevails for those variables.
4. Any custom signed MSA amendment prevails over this base template.

## 5. Commercial License and Service Rights

Subject to payment and compliance with this MSA, Provider grants Customer a non-exclusive, non-transferable, revocable right during the Term to:

- use NT-SZ Commercial Services listed in an executed Order Form;
- use Provider-delivered NT-SZ proprietary artifacts listed in the Order Form;
- operate approved production environments within purchased limits.

No ownership transfer is granted. All rights not expressly granted are reserved by Provider.

## 6. Use Restrictions

Customer must not:

- remove or alter attribution, copyright, trademark, or legal notices;
- sublicense, resell, or white-label Commercial Services without written authorization;
- use services for unlawful, sanctions-violating, fraudulent, or deceptive operations;
- claim Provider endorsement of third-party products without written approval.

## 7. Service Model and SLA

Service tiers are defined in Annex A. Unless otherwise stated:

- 8x5 support covers business days in agreed support timezone.
- 24x7 support covers all calendar days.
- Severity definitions (P1-P4), response targets, and escalation paths are in Annex A.

Provider may update operational runbooks if service quality and security controls are preserved.

## 8. Customer Obligations

Customer will:

- maintain secure key custody and least-privilege access controls;
- keep required chain identity validation before deploy execution;
- preserve auditable Req -> Design -> Code -> Test -> Telemetry evidence for critical releases;
- provide accurate usage and volume reports if variable fees apply;
- maintain legal and regulatory compliance in each deployment jurisdiction.

## 9. Fees, Billing, and Taxes

1. Fees are stated in Annex A.
2. Invoices are issued monthly in advance, unless annual prepay is selected.
3. Payment term is Net 15 calendar days from invoice date.
4. Currency is USD, unless otherwise agreed in writing.
5. Fees are exclusive of taxes. Customer pays applicable taxes, duties, and withholdings.

## 10. Late Payment and Suspension

1. Overdue balances accrue 1.5% monthly interest, or the maximum legal rate if lower.
2. If payment remains overdue 15 days after written notice, Provider may suspend support, updates, or managed endpoints.
3. If overdue 45 days after written notice, Provider may terminate commercial rights under this MSA and all Order Forms.

## 11. Usage Reporting and Audit

If usage-based fees apply, Customer must submit monthly usage reports including:

- active production environments;
- deployment count;
- Value Flow figures and calculation basis.

Provider may perform one commercial audit per rolling 12-month period with at least 10 business days notice.

## 12. Confidentiality

Each party must protect Confidential Information using at least reasonable care and use it only for this MSA.
Confidentiality obligations survive for 5 years after termination, except trade secrets survive while legally protectable.

## 13. Data Protection

If personal data is processed by Provider, parties must execute a DPA before production processing starts.
Until a DPA is executed, Customer must not transmit personal data to Provider-managed systems.

## 14. Compliance and Sanctions

Each party represents it is not blocked or sanctioned under applicable law and will not use this MSA to violate export controls, sanctions, AML, or anti-bribery rules.

## 15. Warranty Disclaimer

Except as expressly stated in this MSA, services and deliverables are provided "as is" and "as available," without warranties of merchantability, fitness for a particular purpose, non-infringement, or uninterrupted operation.

## 16. Limitation of Liability

To the maximum extent allowed by law:

- neither party is liable for indirect, incidental, special, consequential, or punitive damages;
- each party's aggregate liability under this MSA is capped at the total fees paid or payable by Customer under the affected Order Form in the 12 months before the event giving rise to liability.

This section does not limit liability for willful misconduct, fraud, or liabilities that cannot be limited by law.

## 17. Indemnification

Each party will defend and indemnify the other from third-party claims arising from:

- its breach of this MSA;
- its unlawful conduct or gross negligence;
- its violation of applicable regulation in its own operations.

## 18. Term and Termination

1. This MSA starts on Effective Date and remains active until terminated.
2. Either party may terminate for convenience with 30 days written notice if no active Order Form remains.
3. Either party may terminate for material breach not cured within 15 days after written notice.
4. Non-payment termination follows Section 10.

## 19. Effects of Termination

Upon termination:

- commercial usage rights granted under this MSA end immediately, unless otherwise stated in writing;
- unpaid fees remain due and payable;
- each party returns or securely destroys Confidential Information on request, except legally required retention;
- Open Source Component rights continue under their open-source licenses.

## 20. Governing Law and Dispute Resolution

- Governing law: `[STATE_OR_COUNTRY]`.
- Venue and jurisdiction: `[COURT_OR_ARBITRATION_FORUM]`.
- Language of contract and dispute process: `[LANGUAGE]`.

## 21. Signatures

Provider  
Legal name: `[PROVIDER_LEGAL_NAME]`  
Name: `[PROVIDER_SIGNATORY_NAME]`  
Title: `[PROVIDER_SIGNATORY_TITLE]`  
Date: `[YYYY-MM-DD]`  
Signature: ______________________

Customer  
Legal name: `[CUSTOMER_LEGAL_NAME]`  
Name: `[CUSTOMER_SIGNATORY_NAME]`  
Title: `[CUSTOMER_SIGNATORY_TITLE]`  
Date: `[YYYY-MM-DD]`  
Signature: ______________________

---

## Annex A - Order Form (Template)

Order Form ID: `[OF-XXXX]`  
MSA Effective Date: `[YYYY-MM-DD]`  
Order Form Effective Date: `[YYYY-MM-DD]`  
Initial Term: `[12 months]`  
Auto-renewal: `[yes/no + period]`

### A1. Commercial Scope

- Product/Service: `Clockchain NeuroTrace-SZ commercial operation`
- Included environments: `[count]`
- Included networks: `[list]`
- Included modules/features: `[list]`
- Support tier: `[8x5 or 24x7]`

### A2. Pricing

| Item | Unit price (USD) | Qty | Subtotal (USD) |
| --- | ---: | ---: | ---: |
| Base NT-SZ commercial license (monthly) | 1500 | `[n]` | `[calc]` |
| Extra production network (monthly) | 500 | `[n]` | `[calc]` |
| SLA 8x5 (monthly) | 900 | `[0 or 1]` | `[calc]` |
| SLA 24x7 (monthly) | 3000 | `[0 or 1]` | `[calc]` |
| Professional services (hourly) | 120 | `[hours]` | `[calc]` |
| Variable value-flow fee (optional) | 0.15% above 100000 | `[formula]` | `[calc]` |

Monthly subtotal (before taxes): `[USD amount]`  
Tax treatment: `[jurisdiction and tax ID details]`

Variable fee formula (if enabled):  
`variable_fee = max(0, ValueFlowUSD - 100000) * 0.0015`

### A3. Billing and Payment Details

- Invoice frequency: `[monthly advance / annual advance]`
- Payment term: `Net 15`
- Currency: `USD` (unless otherwise stated)
- Billing contact: `[name + email]`
- Finance contact: `[name + email]`
- Purchase order required: `[yes/no]`

### A4. SLA Targets

| Severity | Example | 8x5 first response | 24x7 first response |
| --- | --- | --- | --- |
| P1 | Production outage or blocked settlement | 4 business hours | 30 minutes |
| P2 | Major degradation, workaround limited | 8 business hours | 2 hours |
| P3 | Partial impact, workaround available | 2 business days | 1 business day |
| P4 | Informational or cosmetic issue | 5 business days | 3 business days |

### A5. Acceptance and Go-Live Conditions

Go-live requires:

- no open P0 risk in defined release scope;
- Req/CTR coverage with at least one TST and one MET on release-critical paths;
- chain/network identity validation evidence before deploy.

### A6. Signatures

Provider signatory: `[name/title/date/signature]`  
Customer signatory: `[name/title/date/signature]`

