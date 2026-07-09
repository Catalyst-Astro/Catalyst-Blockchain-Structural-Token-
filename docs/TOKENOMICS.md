# Catalyst Tokenomics — CAT & FRT Value Model

## How tokens get REAL value (not speculation)

```
                      ┌──────────────────────┐
                      │   CATALYST PLATFORM   │
                      │                      │
  Companies ──CAT──→  │  Audit Service        │
  Projects  ──CAT──→  │  Project Registration  │
  Investors ──CAT──→  │  Compliance (KYC/AML)  │
  Assets    ──CAT──→  │  Valuation Reports     │
  Funds     ──CAT──→  │  Private Offering Setup │
                      │                      │
                      └──────┬───────────────┘
                             │
              60% → Treasury (liquidity, dev)
              25% → FRT Staking Pool
              10% → Validator Rewards
               5% → BURN (CAT deflationary)
```

---

## CAT — Utility Token

**Purpose:** Required to access platform services. NOT a speculative meme coin.

| Service | CAT Cost | USD Equivalent* | Market Rate |
|---|---|---|---|
| Project Registration | 1,000 CAT | ~$100 | One-time |
| Audit Basic | 10,000 CAT | ~$1,000 | Per cycle |
| Audit Enterprise | 50,000 CAT | ~$5,000 | Annual |
| Compliance Basic | 5,000 CAT | ~$500 | Monthly |
| Compliance Enterprise | 25,000 CAT | ~$2,500 | Monthly |
| Identity Verification | 100 CAT | ~$10 | Per user |
| Valuation Report | 5,000 CAT | ~$500 | Per asset |
| Private Offering | 2% of raise | Variable | Per offering |

*\*At target CAT price of $0.10 (initial). Adjustable by governance.*

---

## FRT — Reward Token

**Purpose:** Incentive token distributed to platform users, validators, and stakers.

| Source | Distribution |
|---|---|
| 25% of all CAT fees | Staking pool |
| Platform activity | Weekly airdrop |
| Audit completions | Bonus FRT |
| Project milestones | Milestone rewards |

---

## Value Accrual Mechanisms

### 1. Burn (5% of every fee)
- Every service purchase burns CAT
- Supply decreases with platform usage
- Deflationary pressure: more usage → less supply → higher price

### 2. Lock-up for Services
- CAT is locked during audit cycles (30-90 days)
- Reduces circulating supply
- Creates predictable demand from registered projects

### 3. Treasury Backing
- 60% of fees fund treasury
- Treasury provides liquidity on Uniswap (CAT/ETH pair)
- Treasury buys back and burns CAT during surplus

### 4. Project Pipeline Value
- Registered projects stake CAT as commitment
- Project count × avg project value = platform TVL
- Platform TVL / CAT supply = fundamental CAT price floor

---

## Valuation Formula

```
CAT_Price = (Total_CAT_Staked + Annual_Fee_Revenue_CAT) / Circulating_Supply

Where:
  Total_CAT_Staked = Sum of CAT locked in active projects and audits
  Annual_Fee_Revenue = Projected 12-month CAT fee volume
  Circulating_Supply = CAT in circulation (excluding burned, locked)

Example (Year 1 target):
  Projects registered:      100
  Avg CAT staked/project:   5,000
  Total CAT Staked:         500,000
  Annual Fee Revenue:       250,000 CAT
  Circulating Supply:       800,000,000 (after 200M burned/locked)
  → CAT_Price = 750,000 / 800,000,000 = $0.0009375 per CAT

Example (Year 3 target):
  Projects registered:      5,000
  Avg CAT staked/project:   10,000
  Total CAT Staked:         50,000,000
  Annual Fee Revenue:       25,000,000 CAT
  Circulating Supply:       500,000,000 (after 500M burned/locked)
  → CAT_Price = 75,000,000 / 500,000,000 = $0.15 per CAT
```

---

## Revenue Streams

| Stream | Annual Target (Y1) | Annual Target (Y3) |
|---|---|---|
| Project Registration | $10,000 | $500,000 |
| Audit Services | $50,000 | $2,500,000 |
| Compliance Subscriptions | $30,000 | $1,500,000 |
| Identity Verification | $5,000 | $250,000 |
| Private Offerings (2% fee) | $20,000 | $1,000,000 |
| **Total Platform Revenue** | **$115,000** | **$5,750,000** |

---

## Token Distribution

| Allocation | % | Amount | Vesting |
|---|---|---|---|
| Platform Treasury | 30% | 300M CAT | 4 years |
| Community & Ecosystem | 25% | 250M CAT | 3 years |
| Team & Advisors | 15% | 150M CAT | 4 years, 1yr cliff |
| Private Sale | 15% | 150M CAT | 1 year |
| Liquidity (Uniswap) | 10% | 100M CAT | Unlocked |
| Airdrop (early users) | 5% | 50M CAT | 6 months |
| **Total** | **100%** | **1B CAT** | |

---

## Contracts that power this model

| Contract | Role |
|---|---|
| `ServicePricing.sol` | Fee engine — CAT required for all services |
| `Treasury.sol` | Custody of platform fees |
| `FRTDistributor.sol` | FRT reward distribution |
| `ValuationLedger.sol` | Asset price discovery |
| `SettlementLog.sol` | Immutable audit trail |
| `PrivateOfferingRegistry.sol` | Regulated capital raises |
| `ProjectRegistry.sol` | On-chain project registration |
| `AuditManager.sol` | Audit lifecycle management |
| `FiduciaryOracle.sol` | Price oracle for CAT valuation |

---

## Next Steps

1. ✅ Deploy on Hardhat local
2. ⬜ Deploy on Sepolia testnet
3. ⬜ Create Uniswap V3 pool (CAT/ETH) on Sepolia
4. ⬜ Onboard 10 test projects
5. ⬜ Mainnet audit + deploy
6. ⬜ List on CoinGecko / DEX
