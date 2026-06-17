// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IMXNPriceOracle.sol";

/// @title MXNPriceOracle
/// @notice On-chain oracle that tracks CAT/USD, USD/MXN, and calculates CAT/MXN.
///
///         Architecture:
///         ┌──────────────┐    ┌──────────────┐
///         │  CAT/USD     │    │  USD/MXN     │
///         │  (pool or    │    │  (Banxico /  │
///         │   governance)│    │   Chainlink) │
///         └──────┬───────┘    └──────┬───────┘
///                │                  │
///                └────────┬─────────┘
///                         │
///                 ┌───────▼───────┐
///                 │   CAT/MXN     │
///                 │ = CAT_USD ×   │
///                 │   USD_MXN     │
///                 │   ÷ 1e18      │
///                 └───────────────┘
///
///         Testnet mode: Governance sets rates manually.
///         Mainnet mode: Uses Chainlink MXN/USD feed + Uniswap TWAP for CAT/USD.
///
///         Rates are stored with 1e18 precision:
///         - CAT/USD = 0.10 means 0.10 × 1e18 = 1e17
///         - USD/MXN = 20.00 means 20.00 × 1e18 = 20e18
///         - CAT/MXN = (1e17 × 20e18) / 1e18 = 2e18, meaning 1 CAT = 2 MXN
///
///         Examples (with 1 CAT = 0.10 USD, 1 USD = 20 MXN → 1 CAT = 2 MXN):
///         ┌────────────────────────┬──────────────┬──────────────┐
///         │ Service                │ MXN Price    │ CAT Needed   │
///         ├────────────────────────┼──────────────┼──────────────┤
///         │ Project Registration   │ $2,000 MXN   │ 1,000 CAT    │
///         │ Audit Basic            │ $20,000 MXN  │ 10,000 CAT   │
///         │ Audit Enterprise       │ $100,000 MXN │ 50,000 CAT   │
///         │ Identity Verification  │ $200 MXN     │ 100 CAT      │
///         │ AI Chat                │ $20 MXN      │ 10 AIM       │
///         └────────────────────────┴──────────────┴──────────────┘
contract MXNPriceOracle is IMXNPriceOracle, AccessControl, Pausable {
    // ── Roles ──
    bytes32 public constant RATE_SETTER = keccak256("RATE_SETTER");

    // ── Rates (1e18 precision) ──
    /// @dev 1 CAT = catUsdRate USD. e.g. $0.10 USD → 0.10 × 1e18 = 100000000000000000
    uint256 private _catUsdRate;

    /// @dev 1 USD = usdMxnRate MXN. e.g. $20.00 MXN → 20.00 × 1e18 = 20000000000000000000
    uint256 private _usdMxnRate;

    // ── Timestamps ──
    uint256 public lastCatUsdUpdate;
    uint256 public lastUsdMxnUpdate;

    // ── Staleness thresholds ──
    uint256 public catUsdStaleAfter = 24 hours;   // CAT/USD can go 24h without update
    uint256 public usdMxnStaleAfter = 24 hours;   // USD/MXN can go 24h without update
    // Mainnet overrides (Banxico updates daily, crypto pools update per-block):
    // uint256 public catUsdStaleAfter = 1 hours;
    // uint256 public usdMxnStaleAfter = 24 hours;

    // ── Precision constants ──
    uint256 public constant PRECISION = 1e18;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ── Chainlink (for mainnet upgrade) ──
    address public chainlinkMxnUsdFeed; // Chainlink MXN/USD price feed
    bool public useChainlink;

    // ── Events ──
    event CatUsdRateUpdated(uint256 oldRate, uint256 newRate, address indexed updater);
    event UsdMxnRateUpdated(uint256 oldRate, uint256 newRate, address indexed updater);
    event StalenessThresholdUpdated(uint256 catUsdStale, uint256 usdMxnStale);
    event ChainlinkFeedUpdated(address indexed oldFeed, address indexed newFeed);

    // ── Errors ──
    error RateStale(string rate);
    error InvalidRate();
    error ZeroAddress();

    constructor(
        address admin_,
        uint256 initialCatUsdRate_,
        uint256 initialUsdMxnRate_
    ) {
        require(admin_ != address(0), "admin required");
        require(initialCatUsdRate_ > 0, "catUsdRate required");
        require(initialUsdMxnRate_ > 0, "usdMxnRate required");

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(RATE_SETTER, admin_);

        _catUsdRate = initialCatUsdRate_;
        _usdMxnRate = initialUsdMxnRate_;
        lastCatUsdUpdate = block.timestamp;
        lastUsdMxnUpdate = block.timestamp;
    }

    // ─────────────────────────────────────────────────────────────
    // ── Rate Setters (governance / multisig) ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Update the CAT/USD rate manually.
    /// @param newRate New rate with 1e18 precision (e.g. $0.10 = 1e17)
    function setCatUsdRate(uint256 newRate) external onlyRole(RATE_SETTER) {
        if (newRate == 0) revert InvalidRate();
        uint256 oldRate = _catUsdRate;
        _catUsdRate = newRate;
        lastCatUsdUpdate = block.timestamp;
        emit CatUsdRateUpdated(oldRate, newRate, msg.sender);
    }

    /// @notice Update the USD/MXN rate manually.
    /// @param newRate New rate with 1e18 precision (e.g. $20.00 MXN = 20e18)
    function setUsdMxnRate(uint256 newRate) external onlyRole(RATE_SETTER) {
        if (newRate == 0) revert InvalidRate();
        uint256 oldRate = _usdMxnRate;
        _usdMxnRate = newRate;
        lastUsdMxnUpdate = block.timestamp;
        emit UsdMxnRateUpdated(oldRate, newRate, msg.sender);
    }

    /// @notice Update both rates in a single transaction.
    function setBothRates(uint256 newCatUsdRate, uint256 newUsdMxnRate)
        external onlyRole(RATE_SETTER)
    {
        if (newCatUsdRate == 0 || newUsdMxnRate == 0) revert InvalidRate();

        uint256 oldCat = _catUsdRate;
        _catUsdRate = newCatUsdRate;
        lastCatUsdUpdate = block.timestamp;
        emit CatUsdRateUpdated(oldCat, newCatUsdRate, msg.sender);

        uint256 oldMxn = _usdMxnRate;
        _usdMxnRate = newUsdMxnRate;
        lastUsdMxnUpdate = block.timestamp;
        emit UsdMxnRateUpdated(oldMxn, newUsdMxnRate, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────
    // ── Staleness management ──
    // ─────────────────────────────────────────────────────────────

    function setStalenessThresholds(uint256 _catUsdStale, uint256 _usdMxnStale)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        catUsdStaleAfter = _catUsdStale;
        usdMxnStaleAfter = _usdMxnStale;
        emit StalenessThresholdUpdated(_catUsdStale, _usdMxnStale);
    }

    /// @notice Returns true if either rate is stale.
    function isStale() public view override returns (bool) {
        return _isCatUsdStale() || _isUsdMxnStale();
    }

    function _isCatUsdStale() internal view returns (bool) {
        return block.timestamp - lastCatUsdUpdate > catUsdStaleAfter;
    }

    function _isUsdMxnStale() internal view returns (bool) {
        return block.timestamp - lastUsdMxnUpdate > usdMxnStaleAfter;
    }

    /// @notice Force the CAT/USD rate to be set again (reverts if stale).
    function requireFresh() external view {
        if (isStale()) {
            if (_isCatUsdStale()) revert RateStale("catUsd");
            if (_isUsdMxnStale()) revert RateStale("usdMxn");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ── Chainlink integration (mainnet) ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Sets the Chainlink MXN/USD price feed address.
    ///         On mainnet, this enables automatic USD/MXN rate from Chainlink.
    function setChainlinkMxnUsdFeed(address feed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ChainlinkFeedUpdated(chainlinkMxnUsdFeed, feed);
        chainlinkMxnUsdFeed = feed;
    }

    function setUseChainlink(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (enabled) require(chainlinkMxnUsdFeed != address(0), "feed not set");
        useChainlink = enabled;
    }

    /// @notice Reads USD/MXN from Chainlink feed (if configured).
    ///         Returns 0 if feed not available.
    ///         Chainlink MXN/USD feed on mainnet:
    ///         e.g. 0x8785F0a4dBbA1C243B4a8A4C5f6A45cD7F8Aa5BF (example)
    function _readChainlinkUsdMxn() internal view returns (uint256) {
        if (chainlinkMxnUsdFeed == address(0)) return 0;
        // In production, use AggregatorV3Interface(chainlinkMxnUsdFeed).latestRoundData()
        // For now, returns 0 to fall back to manual rate.
        // Implementación completa cuando se despliegue en mainnet.
        return 0; // fallback to manual rate
    }

    // ─────────────────────────────────────────────────────────────
    // ── Public Views — the core conversion functions ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Returns the CAT/MXN rate: how many MXN = 1 CAT (1e18 precision)
    /// @dev CAT_MXN = (catUsdRate × usdMxnRate) / PRECISION
    ///      e.g.: (0.10e18 × 20e18) / 1e18 = 2e18 → 1 CAT = 2 MXN
    function getCatMxnRate() public view override returns (uint256) {
        uint256 catUsd = _catUsdRate;
        uint256 usdMxn = _usdMxnRate;
        return (catUsd * usdMxn) / PRECISION;
    }

    /// @notice Returns how many CAT tokens are needed to pay a given MXN amount.
    /// @param mxnAmount Amount in MXN (1e18 precision)
    /// @return catAmount Amount in CAT (1e18 precision)
    /// @dev CAT = MXN / CAT_MXN = MXN × PRECISION / (CAT_USD × USD_MXN)
    function getCatAmountForMxn(uint256 mxnAmount)
        public view override returns (uint256 catAmount)
    {
        uint256 catMxn = getCatMxnRate();
        if (catMxn == 0) return 0;
        // catAmount = mxnAmount × PRECISION / catMxn
        return (mxnAmount * PRECISION) / catMxn;
    }

    /// @notice Returns the MXN value of a given CAT amount.
    /// @param catAmount Amount in CAT (1e18 precision)
    /// @return mxnAmount Value in MXN (1e18 precision)
    function getMxnAmountForCat(uint256 catAmount)
        public view override returns (uint256 mxnAmount)
    {
        uint256 catMxn = getCatMxnRate();
        // mxnAmount = catAmount × catMxn / PRECISION
        return (catAmount * catMxn) / PRECISION;
    }

    /// @notice Returns the raw CAT/USD rate (1e18 precision)
    function getCatUsdRate() public view override returns (uint256) {
        return _catUsdRate;
    }

    /// @notice Returns the raw USD/MXN rate (1e18 precision)
    function getUsdMxnRate() public view override returns (uint256) {
        return _usdMxnRate;
    }

    // ─────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────
    // ── 4-Pillar CAT Valuation (Zettelkasten 4D) ──
    // ─────────────────────────────────────────────────────────────
    // Pillar 1 (Cardinal): CAT/USD base rate — the absolute anchor
    // Pillar 2 (Ordinal): USD/MXN spot rate — the local conversion step
    // Pillar 3 (Forward): Liquidity depth / volume — projected stability
    // Pillar 4 (Reward): Volatility penalty — feedback on rate reliability

    /// @dev Pillar 3 (Forward): Liquidity metrics
    uint256 public liquidityDepthUSD;    // Total liquidity in USD (1e18 scaled)
    uint256 public dailyVolumeUSD;       // 24h volume in USD (1e18 scaled)

    /// @dev Pillar 4 (Reward): Volatility tracking
    uint256 public volatilityBps;         // Annualized volatility in basis points
    uint256 public lastVolatilityUpdate;
    uint256 public constant VOLATILITY_STALE = 7 days;

    /// @dev Valuation weights (basis points, sum = 10000)
    uint256 public weightCardinal = 4000;  // 40% base rate
    uint256 public weightOrdinal = 3000;   // 30% forex conversion
    uint256 public weightForward = 2000;   // 20% liquidity depth
    uint256 public weightReward = 1000;    // 10% volatility penalty

    // ── Events ──
    event LiquidityUpdated(uint256 depthUSD, uint256 volumeUSD);
    event VolatilityUpdated(uint256 volatilityBps);
    event ValuationWeightsUpdated(uint256 wCardinal, uint256 wOrdinal, uint256 wForward, uint256 wReward);

    /// @notice Update liquidity metrics (Pillar 3: Forward).
    function setLiquidityMetrics(uint256 depthUSD, uint256 volumeUSD)
        external onlyRole(RATE_SETTER)
    {
        liquidityDepthUSD = depthUSD;
        dailyVolumeUSD = volumeUSD;
        emit LiquidityUpdated(depthUSD, volumeUSD);
    }

    /// @notice Update volatility (Pillar 4: Reward).
    /// @param volBps Annualized volatility in basis points (e.g., 2500 = 25%)
    function setVolatility(uint256 volBps) external onlyRole(RATE_SETTER) {
        volatilityBps = volBps;
        lastVolatilityUpdate = block.timestamp;
        emit VolatilityUpdated(volBps);
    }

    /// @notice Update valuation weights.
    function setValuationWeights(uint256 wC, uint256 wO, uint256 wF, uint256 wR)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(wC + wO + wF + wR == 10000, "must sum to 100%");
        weightCardinal = wC;
        weightOrdinal = wO;
        weightForward = wF;
        weightReward = wR;
        emit ValuationWeightsUpdated(wC, wO, wF, wR);
    }

    /// @notice 4-Pillar CAT/MXN valuation.
    ///         Combines all 4 pillars into a weighted fair value.
    ///
    ///         V = wC × V_cardinal + wO × V_ordinal + wF × V_forward + wR × V_reward
    ///
    ///         Where:
    ///         - V_cardinal = CAT/USD × USD/MXN (the anchor)
    ///         - V_ordinal = CAT/USD × USD/MXN × (1 + forex_spread_penalty)
    ///         - V_forward = CAT/USD × USD/MXN × liquidity_bonus
    ///           (higher liquidity → premium, lower → discount)
    ///         - V_reward = volatility_penalty
    ///           (higher volatility → discount, lower → premium)
    ///
    ///         Liquidity bonus: depth_to_volume_ratio mapped to [-10%, +10%]
    ///         Volatility penalty: mapped from [0%, 200%] to [0%, -20%]
    function getCatMxnFairValue() public view returns (
        uint256 fairValue,       // Weighted fair value (1e18 precision)
        uint256 cardinalValue,   // Pillar 1 contribution
        uint256 ordinalValue,    // Pillar 2 contribution
        uint256 forwardValue,    // Pillar 3 contribution
        int256 rewardValue       // Pillar 4 contribution (can be negative)
    ) {
        // Base rate
        uint256 catMxn = getCatMxnRate();
        cardinalValue = (catMxn * weightCardinal) / 10000;

        // Ordinal: forex conversion with spread
        // Assume a 1% spread penalty (representing bid/ask in real forex markets)
        uint256 spreadPenalty = 9900; // 99% of base (1% penalty)
        uint256 ordinalBase = (catMxn * spreadPenalty) / 10000;
        ordinalValue = (ordinalBase * weightOrdinal) / 10000;

        // Forward: liquidity bonus/penalty
        // depthRatio = liquidityDepth / dailyVolume (how many days of volume is covered)
        int256 liquidityBonus;
        if (dailyVolumeUSD > 0 && liquidityDepthUSD > 0) {
            uint256 depthRatio = (liquidityDepthUSD * 1e18) / dailyVolumeUSD;
            // Target ratio: 2x (depth = 2 × daily volume). Map [0.5x, 10x] → [-5%, +10%]
            if (depthRatio > 2e18) {
                // High liquidity → premium up to +10%
                uint256 premium = ((depthRatio - 2e18) * 1000) / 8e18; // 10% max
                if (premium > 1000) premium = 1000; // cap at +10%
                liquidityBonus = int256(premium);
            } else if (depthRatio < 2e18) {
                // Low liquidity → penalty up to -5%
                uint256 penalty = ((2e18 - depthRatio) * 500) / 1500000000000000000; // 0.5e18 = 0.5x floor
                if (penalty > 500) penalty = 500; // cap at -5%
                liquidityBonus = -int256(penalty);
            }
        }
        uint256 forwardFactor = uint256(int256(10000) + liquidityBonus);
        forwardValue = (catMxn * forwardFactor * weightForward) / 10000 / 10000;

        // Reward: volatility penalty
        // volatilityBps of 0 → +5% premium. 10000 (100%) → -20% penalty.
        int256 volAdjustment;
        if (volatilityBps > 0) {
            // Map [0, 20000] bps → [+500, -2000] bps
            if (volatilityBps <= 5000) {
                // Low volatility → premium
                volAdjustment = int256(500 - (volatilityBps * 500) / 5000);
            } else {
                // High volatility → penalty
                uint256 excess = volatilityBps - 5000;
                volAdjustment = -int256((excess * 2000) / 15000);
                if (volAdjustment < -2000) volAdjustment = -2000;
            }
        } else {
            volAdjustment = 500; // No volatility data → small premium
        }
        uint256 rewardFactor = uint256(int256(10000) + volAdjustment);
        rewardValue = int256((catMxn * rewardFactor * weightReward) / 10000 / 10000);

        // Weighted sum
        fairValue = cardinalValue + ordinalValue + forwardValue + uint256(rewardValue);
        return (fairValue, cardinalValue, ordinalValue, forwardValue, rewardValue);
    }

    /// @notice Get the Pentetraktys state of the CAT/MXN valuation.
    ///         Tesis: Base CAT/MXN rate (Cardinal anchor)
    ///         Antitesis: Market deviation (spread + volatility)
    ///         Sintesis: Fair value (4-pillar weighted)
    ///         Conclusion: Forward signal (bullish/bearish based on liquidity trend)
    ///         Hybrys: True if valuation is purely theoretical (no liquidity data)
    function getValuationPentetraktys() external view returns (
        uint256 tesis,
        uint256 antitesis,
        uint256 sintesis,
        int256 conclusion,
        bool hybrys
    ) {
        tesis = getCatMxnRate();
        // Antitesis: deviation = |fairValue - baseRate| / baseRate
        (uint256 fairVal, , , , ) = this.getCatMxnFairValue();
        if (fairVal > tesis) {
            antitesis = ((fairVal - tesis) * 1e18) / tesis;
        } else if (tesis > fairVal) {
            antitesis = ((tesis - fairVal) * 1e18) / tesis;
        } else {
            antitesis = 0;
        }
        sintesis = fairVal;
        // Forward signal: positive if liquidity > 2x volume
        if (dailyVolumeUSD > 0 && liquidityDepthUSD > 2 * dailyVolumeUSD) {
            conclusion = 1; // Bullish
        } else if (dailyVolumeUSD > 0 && liquidityDepthUSD < dailyVolumeUSD) {
            conclusion = -1; // Bearish
        } else {
            conclusion = 0; // Neutral
        }
        // Hybrys: no liquidity data at all (purely theoretical valuation)
        hybrys = (liquidityDepthUSD == 0 && dailyVolumeUSD == 0);
    }

    // ── Emergency ──
    // ─────────────────────────────────────────────────────────────

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
