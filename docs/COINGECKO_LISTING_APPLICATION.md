# CoinGecko Listing Application — Catalyst Token (CAT)

**Date:** July 13, 2026  
**Applicant:** Catalyst Blockchain Labs S.A. de C.V.  
**Request Type:** New Token Listing — Active  
**Review Pass:** Regular (Free)  

---

## 1. TOKEN IDENTIFICATION

| Field | Value |
|---|---|
| **Token Name** | Catalyst Token |
| **Ticker / Symbol** | CAT |
| **Contract Address** | `0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80` |
| **Blockchain Network** | Base (Coinbase L2) — Chain ID 8453 |
| **Token Standard** | ERC-20 (OpenZeppelin v5.x) |
| **Decimals** | 18 |
| **Contract Verified** | ✅ Yes — Verified on BaseScan |
| **Explorer Link** | https://basescan.org/address/0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80#code |
| **Source Code** | Publicly auditable — Apache 2.0 License |

---

## 2. TOKENOMICS & SUPPLY

| Field | Value |
|---|---|
| **Total Supply** | 1,000,000,000 CAT |
| **Circulating Supply** | 898,973,185 CAT |
| **Supply Model** | **ELASTIC** (Autopoietic) — Supply grows with real economic activity, not speculation |
| **Elastic Cap Formula** | `elasticCap = 1B floor + (CNY_processed × 1.457) + (CAT_burned × 0.05)` |
| **Burn Mechanism** | 5% deflationary burn per transaction, enabling controlled supply expansion |
| **Reserve / Treasury** | 100,000,000 CAT (10%) held in Treasury contract `0xD0BDAdf...` |
| **Backing Model** | 1 GNC = 1 CNY — Every processed payment backs the token supply via GananciaToken (GNC) |

**Key Differentiator:** Unlike standard ERC-20 tokens with fixed MAX_SUPPLY, CAT employs an **autopoietic (self-creating) economic model** where supply expands only in response to verified cross-border payment volume. This prevents both supply strangle (Bitcoin's 21M cap problem) and unlimited inflation (fiat problem).

---

## 3. MARKET DATA & TRADING

| Field | Value |
|---|---|
| **Primary DEX** | **Uniswap V4** on Base Mainnet |
| **Trading Pair** | CAT / ETH |
| **Uniswap Pool** | CAT/ETH — fee tier 0.3%, full range liquidity |
| **Price (July 2026)** | **$0.0926 USD** = $1.6184 MXN |
| **Price Oracle** | **4-Pillar Oracle:** CAT/USD + USD/MXN + USD/CNY + CAT/MXN |
| **Real-Time MXN Anchor** | **Banxico SIE API** — Official DOF FIX exchange rate (Series SF43718, SF46410, SF60653, SP68257, SF61745) |
| **USD/MXN Reference Rate** | $17.4758 MXN/USD (Diario Oficial de la Federación, July 3, 2026) |
| **Valuation Source** | Daily Official Gazette of Mexico (DOF) via Banxico live API feed |
| **Additional Trading** | 0x Protocol / Matcha — Limit Orders (maker: 0% fee) |
| | 1inch Limit Orders — Aggregated liquidity |
| | CoW Swap — Batch auction with MEV protection |

**Note on Price Discovery:** CAT's price is anchored to the Mexican Peso through the official Banxico exchange rate, not through speculative AMM dynamics alone. This makes CAT one of the first tokens with a **verifiable, government-published price anchor** rather than purely market-driven pricing.

---

## 4. PROJECT INFORMATION

| Field | Value |
|---|---|
| **Project Name** | Catalyst Blockchain Labs |
| **Legal Entity** | Catalyst Blockchain Labs S.A. de C.V. (Mexico) |
| **Website** | https://github.com/Rinthae/Catalyst-Blockchain-Structural-Token- |
| **Documentation** | Full technical + legal documentation in `/docs/` (211+ files) |
| **Whitepaper** | Whitepaper Juridico-Tecnico (Legal-Technical) |
| **GitHub** | https://github.com/Rinthae/Catalyst-Blockchain-Structural-Token- |
| **License** | Apache 2.0 (code) + BELL 13450.50 (patent protection) |
| **Founded** | June 17, 2026 |
| **Headquarters** | Pachuca, Hidalgo, Mexico |

### Project Description

**Catalyst Token (CAT)** is the first **autopoietic banking token** — a self-creating economic system where token supply expands only in response to verified cross-border QR payment processing volume, not speculation.

The Catalyst Banking System processes cross-border payments from China (UnionPay QR gateway `qr.95516.com`) to Mexico (BBVA via SPEI), converting CNY to CAT tokens with value anchored to the Mexican Peso through the **Banxico official exchange rate (DOF FIX)**.

**Core Innovation:** Unlike standard ERC-20 tokens, CAT uses:
- **Elastic Supply:** No fixed MAX_SUPPLY. Supply grows with real economic activity.
- **Banxico Price Anchor:** Token value in MXN is verified against the official government exchange rate daily.
- **Autopoietic Economics:** The system self-creates — each burn (5% per transaction) enables controlled expansion.
- **13 Banking Protocols (P01-P13):** Full banking infrastructure in COBOL ANSI-85 with 86-account double-entry ledger.
- **21 Processed Payment Triggers:** ¥855 billion CNY processed across a geometric cascade of 13 accounts.

---

## 5. COMPLIANCE & SECURITY

| Field | Value |
|---|---|
| **Contract Audit** | Source code publicly verified on BaseScan |
| **Security Standard** | BELL 13450.50 (31,015 security tests baseline) |
| **Proof Chain** | SHA-256 5-layer (P1→P5) per transaction — immutable and auditable |
| **Compliance Engines** | Whitelist, KYC, Identity SBT, Freeze Enforcement, UBO, Travel Rule (in progress) |
| **Regulatory Framework** | Mexico: Ley de Sistemas de Pagos, Ley Fintech, Banxico Circular 14/2017 |
| | International: UCP 600 Art. 7, TRIPS Art. 45, Paris Convention Art. 10bis |
| **SPEI Integration** | Bitso Business (NVIO Pagos — IFPE authorized by CNBV) |
| **Bank Connection** | BBVA Mexico — CLABE 012290015202390246 |

---

## 6. SOCIAL & COMMUNITY

| Field | Value |
|---|---|
| **GitHub** | https://github.com/Rinthae/Catalyst-Blockchain-Structural-Token- |
| **Logo** | Attached — `catalyst_cat_logo.png` (200×200px PNG) |

*(Additional social channels in development)*

---

## 7. WHY LIST CAT ON COINGECKO

1. **Real Economic Backing:** CAT is not a memecoin. Its value is anchored to Mexico's official exchange rate (Banxico DOF FIX) — a verifiable, government-published data source updated daily.

2. **Innovation in Tokenomics:** The autopoietic elastic supply model represents a genuine advance beyond the standard ERC-20 fixed-supply paradigm. This is newsworthy for the crypto data ecosystem.

3. **Cross-Border Payment Infrastructure:** CAT is the settlement token for a functioning China→Mexico payment processing pipeline. This is real economic utility, not speculative trading.

4. **Verified and Auditable:** Contract source code is fully verified on BaseScan. All transactions generate SHA-256 proof chains. Supply metrics are verifiable on-chain.

5. **Active Trading:** CAT is actively traded on Uniswap V4 (Base Mainnet) with live liquidity. Additional order book depth is available through 0x Protocol, 1inch, and CoW Swap.

6. **Regulatory Alignment:** The project operates within Mexico's Fintech Law framework with licensed SPEI integration through Bitso Business (NVIO Pagos).

---

## 8. APPENDIX — VERIFICATION LINKS

| Resource | URL |
|---|---|
| **Contract (BaseScan)** | https://basescan.org/address/0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80#code |
| **Uniswap V4 Pool** | https://app.uniswap.org/swap?chain=base&inputCurrency=0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80&outputCurrency=ETH |
| **GitHub Repository** | https://github.com/Rinthae/Catalyst-Blockchain-Structural-Token- |
| **Banxico Exchange Rate** | https://www.banxico.org.mx/SieAPIRest/ (SF43718 — USD/MXN FIX) |
| **BaseScan Token Page** | https://basescan.org/token/0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80 |

---

## 9. DECLARATION

I, Mauricio Rodríguez Téllez, representing Catalyst Blockchain Labs S.A. de C.V., hereby certify that all information provided in this application is true, accurate, and complete to the best of my knowledge. The CAT token is actively traded on Uniswap V4 (Base Mainnet) with genuine liquidity. All supply figures are verifiable on-chain via BaseScan. The token price is anchored to the Mexican Peso through the official Banxico DOF FIX exchange rate.

**Submitted by:**  
Mauricio Rodríguez Téllez  
Catalyst Blockchain Labs S.A. de C.V.  
Pachuca, Hidalgo, Mexico  
Email: catalyst@catalyst-banking.ai  

**Application Seal (SHA-256):** `catalyst-coingecko-listing-cat-2026-07-13`

---
