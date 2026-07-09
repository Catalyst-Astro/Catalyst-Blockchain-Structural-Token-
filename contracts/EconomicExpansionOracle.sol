// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title EconomicExpansionOracle
/// @notice Oracle that calculates elastic token supply caps based on real economic activity.
///         Replaces fixed MAX_SUPPLY with demand-driven expansion tied to:
///         - Cross-border payment volume (CNY processed via triggers)
///         - Treasury growth (GNC backing)
///         - QR processing throughput (UnionPay qr.95516.com)
///         - CAT burn rate (deflationary pressure offset)
///         - AI compute consumption (AIM burns)
///
///         Formula: elasticCap = baseSupply + (cnyVolume * cnyMultiplier) + (burnOffset)
///
///         Roles:
///         - ECONOMIC_ORACLE: Can update economic indicators
///         - TREASURY: Catalyst treasury multisig
///         - SWIFT_ISSUER: BCRMXMMPYM bridge
contract EconomicExpansionOracle is AccessControl {
    bytes32 public constant ECONOMIC_ORACLE = keccak256("ECONOMIC_ORACLE");
    bytes32 public constant TREASURY = keccak256("TREASURY");
    bytes32 public constant SWIFT_ISSUER = keccak256("SWIFT_ISSUER");

    // ── Economic Indicators (18 decimals) ──
    uint256 public totalCnyProcessed;       // Total CNY processed by triggers (1e18 scale)
    uint256 public totalMxnSettled;         // Total MXN settled to BBVA
    uint256 public totalCatBurnedGlobal;    // Total CAT burned across all triggers
    uint256 public totalGncBacked;          // Total GNC backed by CNY reserves
    uint256 public totalQrTransactions;     // Total QR triggers processed
    uint256 public totalAIBurned;           // Total AIM consumed by AI services

    // ── Expansion multipliers (basis points, 10000 = 1x) ──
    uint256 public cnyToSupplyMultiplier = 14570;  // 1.457x (100k CNY → ~145,699 CAT)
    uint256 public burnExpansionOffset = 500;      // 5% burn offset enables 5% supply expansion
    uint256 public treasuryGrowthMultiplier = 10000; // 1:1 with GNC backing

    // ── Elastic caps per token (18 decimals) ──
    uint256 public catElasticCap;          // CAT: grows with CNY volume + burn
    uint256 public gncElasticCap;          // GNC: grows 1:1 with CNY backing
    uint256 public ctvElasticCap;          // CTV: grows with GNC conversion demand
    uint256 public aimElasticCap;          // AIM: grows with AI compute demand

    // ── Minimum caps (floor) ──
    uint256 public constant CAT_FLOOR = 2_000_000_000 ether;     // 2B CAT minimum
    uint256 public constant GNC_FLOOR = 18_000_000_000_000 ether; // 18T GNC minimum
    uint256 public constant CTV_FLOOR = 18_000_000_000 ether;    // 18B CTV minimum
    uint256 public constant AIM_FLOOR = 1_000_000_000 ether;     // 1B AIM minimum

    // ── Last update tracking ──
    uint256 public lastExpansionUpdate;
    uint256 public expansionCount;       // Number of expansions performed
    uint256 public constant EXPANSION_COOLDOWN = 1 hours; // Max 24 expansions/day

    // First recalculate is always allowed (expansionCount == 0)

    // ── Events ──
    event EconomicIndicatorsUpdated(
        uint256 cnyProcessed,
        uint256 mxnSettled,
        uint256 catBurned,
        uint256 gncBacked,
        uint256 qrTransactions
    );
    event ElasticCapsRecalculated(
        uint256 catCap,
        uint256 gncCap,
        uint256 ctvCap,
        uint256 aimCap
    );
    event ExpansionMultipliersUpdated(
        uint256 cnyMultiplier,
        uint256 burnOffset,
        uint256 treasuryMultiplier
    );

    constructor(address treasury_, address swiftIssuer_) {
        require(treasury_ != address(0), "treasury required");
        require(swiftIssuer_ != address(0), "swift issuer required");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ECONOMIC_ORACLE, msg.sender);
        _grantRole(TREASURY, treasury_);
        _grantRole(SWIFT_ISSUER, swiftIssuer_);

        // Initialize elastic caps at floor
        catElasticCap = CAT_FLOOR;
        gncElasticCap = GNC_FLOOR;
        ctvElasticCap = CTV_FLOOR;
        aimElasticCap = AIM_FLOOR;
        lastExpansionUpdate = block.timestamp;
    }

    // ─────────────────────────────────────────────────────────────
    // ── Economic Indicator Updates ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Update economic indicators with new trigger processing data.
    /// @param cnyAmount CNY processed in this batch (1e18 scale)
    /// @param mxnAmount MXN settled to BBVA (1e18 scale)
    /// @param catBurned CAT burned in this batch (1e18 scale)
    /// @param gncBacked GNC backing added (1e18 scale)
    /// @param qrCount Number of QR triggers in this batch
    function updateEconomicIndicators(
        uint256 cnyAmount,
        uint256 mxnAmount,
        uint256 catBurned,
        uint256 gncBacked,
        uint256 qrCount
    ) external onlyRole(ECONOMIC_ORACLE) {
        totalCnyProcessed += cnyAmount;
        totalMxnSettled += mxnAmount;
        totalCatBurnedGlobal += catBurned;
        totalGncBacked += gncBacked;
        totalQrTransactions += qrCount;

        emit EconomicIndicatorsUpdated(
            totalCnyProcessed,
            totalMxnSettled,
            totalCatBurnedGlobal,
            totalGncBacked,
            totalQrTransactions
        );
    }

    /// @notice Update AI compute consumption indicator.
    function updateAIConsumption(uint256 aimBurned) external onlyRole(ECONOMIC_ORACLE) {
        totalAIBurned += aimBurned;
    }

    // ─────────────────────────────────────────────────────────────
    // ── Elastic Cap Calculation ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Recalculate all elastic caps based on current economic indicators.
    ///         Can be called at most once per EXPANSION_COOLDOWN.
    function recalculateElasticCaps() external returns (uint256, uint256, uint256, uint256) {
        // First expansion (expansionCount==0) always allowed.
        // Subsequent expansions require cooldown.
        require(
            expansionCount == 0 || block.timestamp >= lastExpansionUpdate + EXPANSION_COOLDOWN,
            "Expansion: cooldown active"
        );
        expansionCount++;

        // CAT elastic cap:
        //   base = CAT_FLOOR
        //   + (CNY processed * cnyMultiplier / 10000)
        //   + (CAT burned * burnOffset / 10000)  [burn enables expansion]
        uint256 catExpansion = (totalCnyProcessed * cnyToSupplyMultiplier) / 10000;
        uint256 catBurnExpansion = (totalCatBurnedGlobal * burnExpansionOffset) / 10000;
        catElasticCap = CAT_FLOOR + catExpansion + catBurnExpansion;

        // GNC elastic cap: 1:1 with CNY backing + 20% buffer for future
        uint256 gncExpansion = totalGncBacked + (totalGncBacked * 2000) / 10000;
        gncElasticCap = GNC_FLOOR > gncExpansion ? GNC_FLOOR : gncExpansion;

        // CTV elastic cap: proportional to GNC (1 CTV per 1000 GNC)
        uint256 ctvExpansion = gncElasticCap / 1000;
        ctvElasticCap = CTV_FLOOR > ctvExpansion ? CTV_FLOOR : ctvExpansion;

        // AIM elastic cap: grows with AI consumption + buffer
        uint256 aimExpansion = totalAIBurned + (totalAIBurned * 5000) / 10000; // 50% buffer
        aimElasticCap = AIM_FLOOR > aimExpansion ? AIM_FLOOR : aimExpansion;

        lastExpansionUpdate = block.timestamp;

        emit ElasticCapsRecalculated(catElasticCap, gncElasticCap, ctvElasticCap, aimElasticCap);

        return (catElasticCap, gncElasticCap, ctvElasticCap, aimElasticCap);
    }

    // ─────────────────────────────────────────────────────────────
    // ── Admin: Adjust Multipliers ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Adjust economic multipliers. Only DEFAULT_ADMIN_ROLE.
    function setExpansionMultipliers(
        uint256 cnyMultiplier_,
        uint256 burnOffset_,
        uint256 treasuryMultiplier_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(cnyMultiplier_ <= 50000, "cny multiplier too high");     // max 5x
        require(burnOffset_ <= 2000, "burn offset too high");            // max 20%
        require(treasuryMultiplier_ <= 20000, "treasury multiplier too high"); // max 2x
        cnyToSupplyMultiplier = cnyMultiplier_;
        burnExpansionOffset = burnOffset_;
        treasuryGrowthMultiplier = treasuryMultiplier_;
        emit ExpansionMultipliersUpdated(cnyMultiplier_, burnOffset_, treasuryMultiplier_);
    }

    // ─────────────────────────────────────────────────────────────
    // ── Views ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Get all elastic caps at once.
    function getAllElasticCaps() external view returns (
        uint256 catCap,
        uint256 gncCap,
        uint256 ctvCap,
        uint256 aimCap
    ) {
        return (catElasticCap, gncElasticCap, ctvElasticCap, aimElasticCap);
    }

    /// @notice Get expansion headroom for a token (how much can still be minted).
    function getExpansionHeadroom(
        uint256 currentSupply,
        uint256 elasticCap
    ) external pure returns (uint256 headroom, bool canExpand) {
        if (currentSupply >= elasticCap) {
            return (0, false);
        }
        return (elasticCap - currentSupply, true);
    }

    /// @notice Get economic health summary.
    function getEconomicHealth() external view returns (
        uint256 totalCny,
        uint256 totalMxn,
        uint256 totalBurned,
        uint256 totalBacked,
        uint256 totalQR,
        uint256 catCap,
        uint256 gncCap
    ) {
        return (
            totalCnyProcessed,
            totalMxnSettled,
            totalCatBurnedGlobal,
            totalGncBacked,
            totalQrTransactions,
            catElasticCap,
            gncElasticCap
        );
    }
}
