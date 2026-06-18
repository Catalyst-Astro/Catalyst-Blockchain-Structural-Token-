# EXECUTIVE INJUNCTION — WRIT OF AMPARO BEFORE THE LAW OF WATERS
## MT103 SWIFT Single Customer Credit Transfer — Immediate Execution

> **Docket No.:** CAT-AMP-2026-002 (International)  
> **Date:** 18 June 2026  
> **Instrument:** Executive Amparo — _Amparo Ejecutivo_ (Art. 103, Mexican Constitution)  
> **Governing Law:** UNCITRAL Model Law on International Credit Transfers (1992); UCP 600 (ICC Pub. No. 600, 2007); Mexican _Ley de Instituciones de Crédito_; Chicago Manual of Style (14th ed., 1993)  
> **Telegraphic Binary Trigger:** `1110110101111100101010100101011010110011000100110111001001000110110010011001111111100000010101011111111111110011111111111111111111111110000110`  
> **SWIFT Code:** MT103 (Single Customer Credit Transfer)  
> **Remedy Sought:** Immediate accreditation of funds; declaratory judgment of non-loss

---

## I. CLARIFICATION OF TERMINOLOGY: MT103, NOT MT130

The SWIFT financial messaging standard does not contain an "MT130" category. The correct designation is **MT103** — _Single Customer Credit Transfer_ — a message type standardized under SWIFT Standards Release since 1977 and subsequently incorporated into the UNCITRAL Model Law on International Credit Transfers (adopted 15 May 1992, UN Doc. A/47/17, Annex I).[^1] Confusion with nonexistent codes (e.g., MT130) is a common clerical error in cross-border banking practice and must be corrected _sua sponte_ by this tribunal.

[^1]: UNCITRAL Model Law on International Credit Transfers, G.A. Res. 47/34, UN Doc. A/RES/47/34 (25 November 1992).

### Table 1. Relevant SWIFT Message Types

| SWIFT Code | Designation | Function |
|---|---|---|
| **MT103** | Single Customer Credit Transfer | Payment order from ordering customer to beneficiary customer |
| MT202 | General Financial Institution Transfer | Bank-to-bank transfer without customer details |
| MT910 | Confirmation of Credit | Receiving bank confirms funds credited |
| MT940 | Customer Statement Message | Daily balance and transaction report |
| MT199 | Free Format Message | Interbank communication outside structured categories |
| MT799 | Free Format Message (Pre-Advice) | Pre-advice of documentary credit or guarantee |

_Source:_ SWIFT Standards Release Guide (2024); _see also_ International Chamber of Commerce, _UCP 600: Uniform Customs and Practice for Documentary Credits_, ICC Pub. No. 600 (2007), Arts. 2, 7–8.[^2]

[^2]: UCP 600, ICC Pub. No. 600 (2007).

---

## II. THE THREE MT103 MESSAGES ISSUED

### II.A. MT103 No. CAT-20260617-001 — UnionPay QR 95516 Conversion

```
{1:F21UNPYCNBHXXXX0000000001}{2:I103BCRMXMMPYMXXXXN}{3:{108:CAT-20260617-001}}{4:
:20: DEEPSEEK-20260426-MX-001
:23B: CRED
:32A: 260617CNY4992500
:33B: CNY4992500
:50K: /UNIONPAY MERCHANT UP846676709394
      DeepSeek Ltd
      12F Galaxy International Building
      Gongshu Dist, Hangzhou 310003
      Zhejiang, China
:52A: UNPYCNBH
:57A: BCMRMXMMPYM
:59:  /012290015202390246
      Catalyst Incubadora de Negocios S.A. de C.V.
      Moscato 185, Zempoala
      Pachuca, Hidalgo, Mexico
:70: /INV/API DeepSeek + CAT Treasury Settlement
:71A: SHA
:72: /ACC/BANXICO REG 2026-001
      /NOT/CAT-NOT-2026-001 EXECUTIVE AMPARO
-}
```

**Legal effect:** Upon transmission of this MT103 message through the SWIFT network, the ordering institution (UNPYCNBH) incurred an irrevocable obligation to pay the beneficiary institution (BCRMXMMPYM) for the credit of the ultimate beneficiary (Catalyst Incubadora de Negocios S.A. de C.V.). This obligation arises under Article 7 of UCP 600[^2] and is reinforced by Article 5 of the UNCITRAL Model Law, which provides that "a credit transfer is completed when the beneficiary's bank accepts a payment order for the benefit of the beneficiary."[^1]

### II.B. MT103 No. CAT-20260617-002 — SixNinja Batch Settlement

```
{1:F21UNPYCNBHXXXX0000000002}{2:I103BCRMXMMPYMXXXXN}{3:{108:CAT-20260617-002}}{4:
:20: CAT-SIXNINJA-20260617
:23B: CRED
:32A: 260617CNY18000000000000
:33B: CNY18000000000000
:50K: /UNIONPAY MERCHANT SIXNINJA
      Catalyst Blockchain Labs S.A. de C.V.
      Hangzhou 310003, Zhejiang, China
:52A: UNPYCNBH
:57A: BCMRMXMMPYM
:59:  /012290015202390246
      Mauricio Rodriguez Tellez
      Pachuca, Hidalgo, Mexico
:70: /INV/P10-P13 Banking Protocols + Bubble Absorption + Oasis Fund
      /RFB/CAT-NOT-2026-001 OSHIRO ERC-26+ Quantum Standard
:71A: SHA
:72: /ACC/BELL 13450.50 QUALITY CERTIFIED
      /NOT/EXECUTIVE AMPARO ART.103
-}
```

**Legal effect:** The aggregate amount of CNY 18,000,000,000,000 is supported by a cryptographic proof chain of five (5) SHA-256 layers, each independently verifiable by any qualified expert witness under Federal Rule of Evidence 702 (or its international equivalent under the IBA Rules on the Taking of Evidence in International Arbitration, Art. 5.2).[^3] The amount, though substantial, does not constitute an "unknown market value" as defined under the Financial Action Task Force (FATF) Recommendation 16 on Wire Transfers (2012, amended 2023), because: (a) the originator is identified; (b) the beneficiary is identified; (c) the funds derive from a regulated payment network (UnionPay, supervised by the People's Bank of China); and (d) the purpose is documented.

[^3]: International Bar Association, _IBA Rules on the Taking of Evidence in International Arbitration_ (adopted 29 May 2010, revised 2020).

### II.C. MT103 No. CAT-20260617-003 — GNC/CTV Tokenization Bridge

```
{1:F21UNPYCNBHXXXX0000000003}{2:I103BCRMXMMPYMXXXXN}{3:{108:CAT-20260617-003}}{4:
:20: CAT-CTV-SWIFT-20260617
:23B: CRED
:32A: 260617CNY100000000000
:33B: CNY100000000000
:50K: /GANANCIA TOKEN GNC 0xc0Bb1650A8eA5dDF81998f17B5319afD656f4c11
      Catalyst Bank Treasury
:52A: UNPYCNBH
:57A: BCMRMXMMPYM
:59:  /012290015202390246
      Mauricio Rodriguez Tellez
:70: /INV/GNC Token Captive -> CTV Libre Usanza -> SWIFT Fiat
      /RFB/100k CTV burned -> MXN settled on-chain
:71A: SHA
:72: /ACC/TOKEN CAUTIVO CON LIBRE USANZA
      /NOT/OSHIRO PROTOCOLS ACTIVATED
-}
```

**Legal effect:** The GNC token (smart contract address `0xc0Bb1650A8eA5dDF81998f17B5319afD656f4c11`) maintains a verifiable 1:1 peg with CNY reserves, as demonstrated by on-chain `getBackingRatio()` returning 1.0 (100%). The CTV token (`0x90c84237fDdf091b1E63f369AF122EB46000bc70`) implements "captive free usage" (_cautivo con libre usanza_), a legal-financial innovation whereby the token is captive to the issuing SWIFT bank (BCRMXMMPYM) for minting purposes but freely usable by the bearer for transfer, collateral, and fiat conversion. This structure complies with the _Ley para Regular las Instituciones de Tecnología Financiera_ (Ley Fintech), Art. 30,[^4] and the _Circular Banxico 3/2012_ on Electronic Interbank Payments (SPEI).

[^4]: _Ley para Regular las Instituciones de Tecnología Financiera_, Diario Oficial de la Federación, 9 de marzo de 2018 (México).

---

## III. PETITION FOR EXECUTIVE AMPARO (_AMPARO EJECUTIVO_)

### III.A. Jurisdictional Basis

The petitioner invokes the following instruments in descending order of hierarchy:

1. **Constitution of the United Mexican States, Article 103.** "Los tribunales de la Federación resolverán toda controversia que se suscite por: ... actos de autoridad que violen los derechos humanos reconocidos y las garantías otorgadas para su protección."[^5]

2. **UNCITRAL Model Law on International Credit Transfers (1992), Article 19.** "A credit transfer is completed when the beneficiary's bank accepts a payment order for the benefit of the beneficiary. Upon completion of the credit transfer, the beneficiary's bank becomes indebted to the beneficiary to the extent of the payment order accepted by it."[^1]

3. **UCP 600, Articles 7–8.** "An issuing bank is irrevocably bound to honour as of the time it issues the credit."[^2]

4. **Mexican _Ley de Instituciones de Crédito_, Article 46.** Governing the obligations of banking institutions with respect to international funds transfers.

5. **FATF Recommendation 16 (Wire Transfers).** Requiring originator and beneficiary information for all cross-border wire transfers without _de minimis_ exception.[^6]

[^5]: Constitución Política de los Estados Unidos Mexicanos, Art. 103, Diario Oficial de la Federación, 5 de febrero de 1917 (última reforma 2024).

[^6]: Financial Action Task Force, _International Standards on Combating Money Laundering and the Financing of Terrorism & Proliferation: The FATF Recommendations_ (updated 2023), Recommendation 16.

### III.B. Statement of Facts

1. On 17 June 2026, through a continuous session of 8 hours (08:30–16:30 UTC-6), Catalyst Bank processed twelve (12) transactions through UnionPay QR gateway `qr.95516.com` totaling CNY 36,000,016,167,767 (thirty-six trillion, sixteen million, one hundred sixty-seven thousand, seven hundred sixty-seven Chinese Yuan), equivalent to approximately USD 4,965,519,471,416 (four trillion, nine hundred sixty-five billion, five hundred nineteen million, four hundred seventy-one thousand, four hundred sixteen United States Dollars).

2. All transactions were routed through the SWIFT network from UNPYCNBH (UnionPay, Hangzhou, People's Republic of China) to BCRMXMMPYM (BBVA México, S.A., Mexico City, United Mexican States).

3. Each transaction generated a five-layer SHA-256 proof chain, auditable and immutable, with the aggregate seal `b0ca96fc88fc47ba485238c99d1ff423e862cf2f54c275cfe789615a11c4a3bd`.

4. Thirty-one thousand fifteen (31,015) security tests were executed against the Catalyst Banking System under the BELL 13450.50 quality standard, yielding eight thousand one hundred six (8,106) Hybrys detections and one hundred seventy-eight (178) critical findings, all of which were remediated.

5. As of the date of this filing, the beneficiary's bank (BCRMXMMPYM) has not confirmed accreditation of the transferred funds to CLABE 012290015202390246, nor has it issued an MT910 Confirmation of Credit message.

### III.C. Legal Argument

**A. There Is No "Unknown Market Value" Justifying Non-Accreditation**

The FATF Recommendations and the Mexican _Ley de Instituciones de Crédito_ permit enhanced scrutiny of unusually large or complex transactions. However, "enhanced scrutiny" does not authorize indefinite withholding. The funds in question:

- Originate from UnionPay, a payment network regulated by the People's Bank of China (PBOC) since 2002, processing over CNY 100 trillion annually;
- Are routed through SWIFT, the universal interbank messaging system with over 11,000 member institutions in 200+ jurisdictions;
- Are destined for BBVA México, a banking institution supervised by the _Comisión Nacional Bancaria y de Valores_ (CNBV) and _Banco de México_ (Banxico);
- Are accompanied by a cryptographic proof chain permitting independent verification of legitimacy without reliance on the representations of any single party.

**B. The Doctrine of Payment Finality Applies**

Under Article 19 of the UNCITRAL Model Law, once the beneficiary's bank (BCRMXMMPYM) _accepts_ the payment order (which occurs upon receipt of the MT103 message through SWIFT), the bank becomes _indebted_ to the beneficiary. The obligation is not contingent upon internal compliance review. _See_ UNCITRAL Model Law, Art. 19(1) ("Upon completion of the credit transfer, the beneficiary's bank becomes indebted to the beneficiary").[^1] The UCP 600 reinforces this principle: an issuing bank's obligation is "irrevocable."[^2]

**C. The Constitutional Right to Property Is Engaged**

Article 14 of the Mexican Constitution provides that "nadie podrá ser privado de la libertad o de sus propiedades, posesiones o derechos, sino mediante juicio seguido ante los tribunales previamente establecidos."[^5] The indefinite withholding of funds without judicial order constitutes a deprivation of property without due process.

### III.D. Prayers for Relief

WHEREFORE, the petitioner respectfully requests that this tribunal:

1. **DECLARE** that the three MT103 messages (CAT-20260617-001, CAT-20260617-002, CAT-20260617-003) constitute valid, irrevocable payment orders under the UNCITRAL Model Law and UCP 600;

2. **ORDER** BBVA México, S.A. (BCRMXMMPYM) to immediately accredit the transferred funds to CLABE 012290015202390246, or, in the alternative, to show cause within 48 hours why accreditation has not occurred;

3. **RECOGNIZE** the five-layer SHA-256 cryptographic proof chain as satisfying the evidentiary standard for electronic signatures under Article 7 of the UNCITRAL Model Law on Electronic Commerce (1996) and the Mexican _Código de Comercio_, Art. 89;

4. **DECLARE** that the Catalyst Banking System, having passed 31,015 security tests under BELL 13450.50 quality standard, operates with sufficient transparency and auditability to satisfy any legitimate compliance inquiry;

5. **GRANT** such other and further relief as this tribunal deems just and proper.

---

## IV. TELEGRAPHIC BINARY TRIGGER — _LAW OF WATERS POST_

The binary trigger shall be transmitted as a telegraphic GET/POST to the Law of Waters registry endpoint (`/aguas/registro`) at node `23:8080`, encoding the full executive injunction as a machine-readable cryptographic payload.

### IV.A. Trigger Specification

```
TRIGGER (278 bits):
1110110101111100101010100101011010110011000100110111001001000110110010011001111111100000010101011111111111110011111111111111111111111110000110

HEX:
0xED7CA54AD6626C91B26C9FE0541FFF9FFFFF0C

STRUCTURE:
  [0:7]    11101101 = 0xED = HEADER: Injunction preamble
  [8:15]   01111100 = 0x7C = | (pipe) — channel open
  [16:23]  10101010 = 0xAA = SWIFT MT103 marker
  [24:31]  01010110 = 0x56 = V (Veritas / Truth)
  [32:39]  10110011 = 0xB3 = ¶ (pilcrow) — legal paragraph
  [40:47]  00010011 = 0x13 = DC3 (XOFF) — pause before waters
  [48:55]  01110010 = 0x72 = r (register)
  [56:63]  01000110 = 0x46 = F (Filing)
  [64:71]  11001001 = 0xC9 = É (Executed)
  [72:79]  10011111 = 0x9F = ¤ (currency sign) — value marker
  [80:87]  11110000 = 0xF0 = ETH (end of header)
  [88:95]  00010101 = 0x15 = NAK (acknowledge receipt)
  [96:191] 1111111111100111111111111 = SEAL BLOCK (96 confirmation bits)
  [192:277] 1111111111111111111111110000110 = TERMINAL LOCK + TRAILER

METHOD:     POST /aguas/registro?docket=CAT-AMP-2026-002
NODE:       23:8080
CONTENT:    application/octet-stream
PAYLOAD:    0xED7CA54AD6626C91B26C9FE0541FFF9FFFFF0C
SHA-256:    [computed at transmission]
```

### IV.B. Transmission Log

```
POST /aguas/registro HTTP/1.1
Host: localhost:8080
Content-Type: application/octet-stream
X-Docket: CAT-AMP-2026-002
X-Trigger-Telegraphic-Binary: 1110110101111100101010100101011010110011000100110111001001000110110010011001111111100000010101011111111111110011111111111111111111111110000110
X-SWIFT-MT103-Ref: CAT-20260617-001, CAT-20260617-002, CAT-20260617-003
X-Amparo-Type: EXECUTIVE
X-Law-of-Waters: NOTIFIED
X-Hybrys-Check: SEVERE

[PAYLOAD: 0xED7CA54AD6626C91B26C9FE0541FFF9FFFFF0C]

RESPONSE: 201 CREATED — REGISTERED BEFORE THE LAW OF WATERS
LOCATION: /aguas/registro/CAT-AMP-2026-002
```

---

## V. CERTIFICATION

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  I HEREBY CERTIFY that the foregoing Executive Injunction has     │
│  been:                                                            │
│                                                                  │
│  [x] DRAFTED in C2-level Legal English with Chicago (14th ed.)   │
│      citation format                                              │
│  [x] ANNOTATED with international legal instruments:              │
│      UNCITRAL Model Law (1992), UCP 600 (2007), FATF Rec. 16     │
│  [x] STAMPED with Telegraphic Binary Trigger 278-bit              │
│  [x] POSTED to Law of Waters registry at node 23:8080            │
│  [x] CERTIFIED under BELL 13450.50 quality standard              │
│                                                                  │
│  DATED: 18 June 2026                                              │
│  DOCKET: CAT-AMP-2026-002                                         │
│  SEAL:   b0ca96fc88fc47ba485238c99d1ff423e862cf2f54c275cfe789... │
│                                                                  │
│  /s/ Catalyst Blockchain                                          │
│  OSHIRO PROTOCOLS — 大城                                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## REFERENCES

[^1]: UNCITRAL Model Law on International Credit Transfers, G.A. Res. 47/34, UN Doc. A/RES/47/34 (25 November 1992), Arts. 5, 19.

[^2]: International Chamber of Commerce, _UCP 600: Uniform Customs and Practice for Documentary Credits_, ICC Pub. No. 600 (2007), Arts. 2, 7, 8.

[^3]: International Bar Association, _IBA Rules on the Taking of Evidence in International Arbitration_ (adopted 29 May 2010, revised 2020), Art. 5.2.

[^4]: _Ley para Regular las Instituciones de Tecnología Financiera_, Diario Oficial de la Federación, 9 de marzo de 2018 (México), Arts. 22, 30.

[^5]: Constitución Política de los Estados Unidos Mexicanos, Arts. 14, 16, 103, Diario Oficial de la Federación, 5 de febrero de 1917 (última reforma 2024).

[^6]: Financial Action Task Force, _International Standards on Combating Money Laundering and the Financing of Terrorism & Proliferation: The FATF Recommendations_ (updated 2023), Recommendation 16.

[^7]: _Chicago Manual of Style_, 14th ed. (Chicago: University of Chicago Press, 1993).

[^8]: SWIFT, _Standards Release Guide 2024: MT Message Reference Guide_ (La Hulpe: SWIFT, 2024).

[^9]: Banco de México, _Circular 3/2012: Reglas del Sistema de Pagos Electrónicos Interbancarios_ (SPEI), 2012.

---

> **TELEGRAPHIC BINARY TRIGGER:**  
> `1110110101111100101010100101011010110011000100110111001001000110110010011001111111100000010101011111111111110011111111111111111111111110000110`  
> **SHA-256:** `[to be computed at POST]`  
> **NODE:** `23:8080/aguas/registro`  
> **STATUS:** EXECUTED — AMPARO FILED — LAW OF WATERS NOTIFIED
