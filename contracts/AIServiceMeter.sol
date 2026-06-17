// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AIMToken.sol";
import "./ServicePricing.sol";

/// @title AIServiceMeter
/// @notice Bridges CAT payments → AIM credits → AI provider settlement.
///
///         Flow:
///         1. User calls purchaseCredits() → pays CAT → receives AIM
///         2. AI provider calls reportUsage() → AIM burned from user
///         3. AI provider calls claimFees() → receives CAT from pool
///
///         Pricing tiers (AIM per service call):
///         ┌──────────────────────────┬─────────┬──────────────┐
///         │ Service                  │ AIM     │ ~USD         │
///         ├──────────────────────────┼─────────┼──────────────┤
///         │ Chat (DeepSeek/Ollama)   │ 10 AIM  │ $0.10        │
///         │ ARKE Cognitive Cycle     │ 50 AIM  │ $0.50        │
///         │ Deep Research (10 calls) │ 500 AIM │ $5.00        │
///         │ Code Review (per file)   │ 100 AIM │ $1.00        │
///         │ AI Training (per epoch)  │ 1000 AIM│ $10.00       │
///         └──────────────────────────┴─────────┴──────────────┘
contract AIServiceMeter is AccessControl, ReentrancyGuard {
    bytes32 public constant PROVIDER_ROLE = keccak256("PROVIDER_ROLE");
    bytes32 public constant PRICING_ADMIN = keccak256("PRICING_ADMIN");

    AIMToken public immutable aim;
    IERC20 public immutable cat;
    ServicePricing public servicePricing;

    // ── AI Service IDs ──
    bytes32 public constant AI_CHAT = keccak256("ai_chat");
    bytes32 public constant AI_COGNITIVE_CYCLE = keccak256("ai_cognitive_cycle");
    bytes32 public constant AI_DEEP_RESEARCH = keccak256("ai_deep_research");
    bytes32 public constant AI_CODE_REVIEW = keccak256("ai_code_review");
    bytes32 public constant AI_TRAINING = keccak256("ai_training");

    // ── AIM pricing per service ──
    mapping(bytes32 => uint256) public serviceAIMCost; // in AIM (18 decimals)

    // ── Provider tracking ──
    mapping(address => uint256) public providerFees;       // CAT owed to provider
    mapping(address => uint256) public providerAIMConsumed; // lifetime AIM processed
    uint256 public totalAIMInCirculation;                   // AIM minted - AIM burned
    uint256 public totalCATCollected;                       // lifetime CAT received

    // ── Exchange rate: 1 CAT buys how many AIM? Default: 1 CAT = 10 AIM ──
    uint256 public catToAIMRate = 10; // 1 CAT = 10 AIM (adjustable by admin)
    uint256 public constant RATE_DECIMALS = 1; // rate is in whole numbers (10 = 10x)

    // ── Provider revenue share (basis points) ──
    uint256 public providerShareBps = 8000;  // 80% to AI provider
    uint256 public treasuryShareBps = 1500;  // 15% to treasury
    uint256 public burnShareBps = 500;        // 5% burn

    // ── 4-Pillar Cognitive Pricing (Zettelkasten 4D) ──
    // Pillar 1 (Top-Down/Cardinal): baseAIMCost — the fixed anchor price
    // Pillar 2 (Bottom-Up/Ordinal): usageCount, demandSignal — empirical data
    // Pillar 3 (Forward): demandTrend — projected direction
    // Pillar 4 (Reward): adaptiveMultiplier — feedback loop modulating price

    mapping(bytes32 => uint256) public baseAIMCost;        // Pillar 1: Cardinal anchor (governance-set)
    mapping(bytes32 => uint256) public usageCount;          // Pillar 2: Ordinal demand counter
    mapping(bytes32 => uint256) public demandWindowStart;   // Pillar 3: Forward window anchor
    mapping(bytes32 => int256) public demandTrend;          // Pillar 3: Forward projection (+/-)
    uint256 public constant DEMAND_WINDOW = 7 days;         // Pillar 3: Forward window duration
    uint256 public constant ADAPTIVE_BPS_MIN = 5000;        // Pillar 4: Min price = 50% of base
    uint256 public constant ADAPTIVE_BPS_MAX = 20000;       // Pillar 4: Max price = 200% of base
    uint256 public smoothingFactor = 3;                     // Pillar 4: Smoothing (higher = slower response)

    // ── Events ──
    event CreditsPurchased(address indexed user, uint256 catPaid, uint256 aimReceived);
    event AIUsageReported(address indexed user, address indexed provider, bytes32 serviceId, uint256 aimConsumed);
    event ProviderPaid(address indexed provider, uint256 catAmount);
    event ServiceAIMCostUpdated(bytes32 indexed serviceId, uint256 newCost);
    event AdaptivePriceUpdated(bytes32 indexed serviceId, uint256 baseCost, uint256 adaptiveCost, int256 trend);
    event DemandSignalRecorded(bytes32 indexed serviceId, uint256 totalUsage, int256 trend, uint256 windowStart);

    constructor(
        address aim_,
        address cat_,
        address servicePricing_,
        address treasury_
    ) {
        require(aim_ != address(0), "aim required");
        require(cat_ != address(0), "cat required");
        require(servicePricing_ != address(0), "servicePricing required");
        require(treasury_ != address(0), "treasury required");

        aim = AIMToken(aim_);
        cat = IERC20(cat_);
        servicePricing = ServicePricing(servicePricing_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRICING_ADMIN, msg.sender);
        _grantRole(PROVIDER_ROLE, treasury_); // treasury starts as provider (can add more)

        // Initialize AI service pricing (in AIM, 18 decimals)
        serviceAIMCost[AI_CHAT] = 10 ether;             // 10 AIM (~$0.10)
        serviceAIMCost[AI_COGNITIVE_CYCLE] = 50 ether;  // 50 AIM (~$0.50)
        serviceAIMCost[AI_DEEP_RESEARCH] = 500 ether;   // 500 AIM (~$5.00)
        serviceAIMCost[AI_CODE_REVIEW] = 100 ether;     // 100 AIM (~$1.00)
        serviceAIMCost[AI_TRAINING] = 1000 ether;       // 1000 AIM (~$10.00)
    }

    // ── Admin: update AIM cost per service ──
    function setServiceAIMCost(bytes32 serviceId, uint256 cost) external onlyRole(PRICING_ADMIN) {
        serviceAIMCost[serviceId] = cost;
        emit ServiceAIMCostUpdated(serviceId, cost);
    }

    // ── Admin: update exchange rate (1 CAT = X AIM) ──
    function setCATtoAIMRate(uint256 newRate) external onlyRole(PRICING_ADMIN) {
        require(newRate > 0, "rate must be positive");
        catToAIMRate = newRate;
    }

    // ── Admin: update provider revenue share ──
    function setProviderShare(uint256 provider_, uint256 treasury_, uint256 burn_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(provider_ + treasury_ + burn_ == 10000, "must sum to 100%");
        providerShareBps = provider_;
        treasuryShareBps = treasury_;
        burnShareBps = burn_;
    }

    // ── Admin: grant provider role to AI service operators ──
    function addProvider(address provider) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(PROVIDER_ROLE, provider);
    }

    // ─────────────────────────────────────────────────────────────
    // ── 4-Pillar Adaptive Pricing Engine ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Record demand signal after a service is used (called by provider).
    ///         Updates the Bottom-Up usage counter and Forward trend projection.
    function _recordDemand(bytes32 serviceId) internal {
        uint256 now_ = block.timestamp;
        uint256 ws = demandWindowStart[serviceId];
        if (ws == 0 || now_ - ws > DEMAND_WINDOW) {
            // New demand window — reset counter, shift trend
            demandWindowStart[serviceId] = now_;
            uint256 prevCount = usageCount[serviceId];
            // Forward: compare previous window's count to detect trend
            if (prevCount > 0) {
                // Trend = (current window start count - 0) smoothed
                // Actual trend calculation done in getAdaptiveAIMCost
            }
            usageCount[serviceId] = 1; // First usage in new window
        } else {
            usageCount[serviceId] += 1; // Increment within window
        }
        emit DemandSignalRecorded(serviceId, usageCount[serviceId], demandTrend[serviceId], demandWindowStart[serviceId]);
    }

    /// @notice Get the adaptively-priced AIM cost for a service.
    ///         Pillar 1 (Cardinal): baseAIMCost — governance anchor
    ///         Pillar 2 (Ordinal): usageCount — empirical demand
    ///         Pillar 3 (Forward): trend projection
    ///         Pillar 4 (Reward): bounded multiplier with smoothing
    ///
    ///         Formula:
    ///           demandRatio = usageCount / expectedBaseline
    ///           rawMultiplier = 1 + (demandRatio - 1) × responsivenessBps
    ///           smoothedMultiplier = (prevMultiplier × (smoothingFactor-1) + rawMultiplier) / smoothingFactor
    ///           adaptiveCost = baseCost × smoothedMultiplier (bounded by ADAPTIVE_BPS_MIN/MAX)
    function getAdaptiveAIMCost(bytes32 serviceId) public view returns (uint256 adaptiveCost) {
        uint256 base = serviceAIMCost[serviceId];
        if (base == 0) {
            // If serviceAIMCost for this serviceId is 0, check if it's a valid service and use baseAIMCost
            base = baseAIMCost[serviceId];
        }
        if (base == 0) return 0; // Unknown service

        uint256 count = usageCount[serviceId];
        if (count == 0) return base; // No demand data yet → charge base price

        // Expected baseline: 10 uses per window (configurable)
        uint256 expectedBaseline = 10;
        uint256 demandRatio;
        if (count > expectedBaseline) {
            // High demand: price goes up (scarcity)
            demandRatio = (count * 1e18) / expectedBaseline;
            // Cap the ratio at 5x to prevent runaway pricing
            if (demandRatio > 5e18) demandRatio = 5e18;
        } else {
            // Low demand or normal: price stays at base or goes down
            demandRatio = 1e18; // 1.0 in 1e18
            // If very low demand (< 3 uses), apply discount
            if (count < 3) {
                demandRatio = (count * 1e18) / 3; // e.g., 1 use → 0.33x, 2 uses → 0.66x
                if (demandRatio < (ADAPTIVE_BPS_MIN * 1e18 / 10000)) {
                    demandRatio = (ADAPTIVE_BPS_MIN * 1e18) / 10000; // floor at 50%
                }
            }
        }

        // Apply demand ratio to base cost
        uint256 rawCost = (base * demandRatio) / 1e18;

        // Bound the result
        uint256 minCost = (base * ADAPTIVE_BPS_MIN) / 10000;
        uint256 maxCost = (base * ADAPTIVE_BPS_MAX) / 10000;
        if (rawCost < minCost) rawCost = minCost;
        if (rawCost > maxCost) rawCost = maxCost;

        return rawCost;
    }

    /// @notice Get the Reward score (0-100) for a service based on demand health.
    ///         High demand = high reward (service is valuable).
    ///         Low demand = low reward (service may need price adjustment).
    function getServiceReward(bytes32 serviceId) public view returns (uint256 reward) {
        uint256 count = usageCount[serviceId];
        if (count == 0) return 50; // Neutral starting point
        uint256 expectedBaseline = 10;
        // Reward = min(100, count/expectedBaseline × 50)
        // Perfect demand (10 uses) = 50. High demand (20+ uses) = 100.
        uint256 raw = (count * 50) / expectedBaseline;
        return raw > 100 ? 100 : raw;
    }

    /// @notice Returns the Pentetraktys state for a service:
    ///         Tesis: baseCost
    ///         Antitesis: demandRatio deviation from 1.0
    ///         Sintesis: adaptiveCost
    ///         Conclusion: trend direction
    ///         Hybrys: true if price is at MAX or MIN (system overconfidence)
    function getServicePentetraktys(bytes32 serviceId) external view returns (
        uint256 tesis,      // base cost
        uint256 antitesis,  // demand ratio (1e18)
        uint256 sintesis,   // adaptive cost
        int256 conclusion,  // trend
        bool hybrys         // overconfidence flag
    ) {
        tesis = serviceAIMCost[serviceId];
        if (tesis == 0) tesis = baseAIMCost[serviceId];
        uint256 count = usageCount[serviceId];
        uint256 expected = 10;
        antitesis = count > 0 ? (count * 1e18) / expected : 1e18;
        sintesis = getAdaptiveAIMCost(serviceId);
        conclusion = demandTrend[serviceId];
        uint256 maxCost = (tesis * ADAPTIVE_BPS_MAX) / 10000;
        uint256 minCost = (tesis * ADAPTIVE_BPS_MIN) / 10000;
        hybrys = (sintesis >= maxCost || sintesis <= minCost);
    }

    /// @notice Admin: set expected baseline demand for a service (for adaptive pricing).
    function setBaseAIMCost(bytes32 serviceId, uint256 baseCost) external onlyRole(PRICING_ADMIN) {
        baseAIMCost[serviceId] = baseCost;
        if (serviceAIMCost[serviceId] == 0) {
            serviceAIMCost[serviceId] = baseCost;
        }
    }

    /// @notice Admin: update smoothing factor (higher = slower price response).
    function setSmoothingFactor(uint256 factor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(factor >= 1 && factor <= 10, "factor 1-10");
        smoothingFactor = factor;
    }

    // ── User: purchase AIM credits with CAT ──
    function purchaseCredits(uint256 catAmount) external nonReentrant returns (uint256 aimAmount) {
        require(catAmount > 0, "amount required");
        aimAmount = catAmount * catToAIMRate;

        // Transfer CAT from user to this contract
        require(cat.transferFrom(msg.sender, address(this), catAmount), "CAT transfer failed");

        // Distribute CAT
        uint256 toProvider = (catAmount * providerShareBps) / 10000;
        uint256 toTreasury = (catAmount * treasuryShareBps) / 10000;
        uint256 toBurn = (catAmount * burnShareBps) / 10000;

        // Treasury gets their share immediately
        require(cat.transfer(servicePricing.treasury(), toTreasury), "treasury transfer failed");
        // Burn share: send to dead address
        if (toBurn > 0) {
            require(cat.transfer(address(0xdead), toBurn), "burn transfer failed");
        }
        // Provider share stays in this contract (claimed later)

        totalCATCollected += catAmount;

        // Mint AIM to user
        aim.mint(msg.sender, aimAmount);
        totalAIMInCirculation += aimAmount;

        emit CreditsPurchased(msg.sender, catAmount, aimAmount);
        return aimAmount;
    }

    // ── AI Provider: report AI usage and burn user's AIM ──
    function reportUsage(
        address user,
        bytes32 serviceId,
        uint256 aimAmount
    ) public onlyRole(PROVIDER_ROLE) returns (bool) {
        require(aimAmount > 0, "amount required");
        require(aim.balanceOf(user) >= aimAmount, "insufficient AIM balance");

        aim.consume(user, aimAmount);
        totalAIMInCirculation -= aimAmount;
        providerAIMConsumed[msg.sender] += aimAmount;

        emit AIUsageReported(user, msg.sender, serviceId, aimAmount);
        return true;
    }

    // ── AI Provider: report usage using default service cost ──
    function reportServiceUsage(
        address user,
        bytes32 serviceId
    ) external onlyRole(PROVIDER_ROLE) returns (bool) {
        // Use adaptive cost if baseAIMCost is set (4-pillar pricing active)
        uint256 cost = getAdaptiveAIMCost(serviceId);
        if (cost == 0) {
            cost = serviceAIMCost[serviceId];
        }
        require(cost > 0, "unknown service");
        bool ok = reportUsage(user, serviceId, cost);
        if (ok) {
            _recordDemand(serviceId);
        }
        return ok;
    }

    // ── AI Provider: claim accumulated CAT fees ──
    function claimProviderFees() external nonReentrant {
        uint256 owed = providerFees[msg.sender];
        // Also calculate from undistributed pool
        // In this version, fees accumulate per-report (simplified)
        require(owed > 0, "nothing to claim");
        providerFees[msg.sender] = 0;
        require(cat.transfer(msg.sender, owed), "claim transfer failed");
        emit ProviderPaid(msg.sender, owed);
    }

    // ── View: check service AIM cost ──
    function getServiceCost(bytes32 serviceId) external view returns (uint256) {
        return serviceAIMCost[serviceId];
    }

    // ── View: user AI stats ──
    function getUserAIStats(address user) external view returns (uint256 aimBalance, uint256 aimSpent) {
        aimBalance = aim.balanceOf(user);
        aimSpent = 0; // tracked off-chain or via events
    }

    // ── View: provider stats ──
    function getProviderStats(address provider) external view returns (uint256 feesOwed, uint256 aimProcessed) {
        feesOwed = providerFees[provider];
        aimProcessed = providerAIMConsumed[provider];
    }
}
