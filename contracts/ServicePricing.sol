// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IMXNPriceOracle.sol";

/// @title ServicePricing
/// @notice Pricing engine for Catalyst platform services.
///         CAT token = utility token to pay for audits, project registration,
///         compliance, and governance. FRT = reward token for platform activity.
///
///         THIS IS WHAT GIVES CAT AND FRT REAL VALUE.
///
///         Two pricing modes (governance-toggleable):
///
///         MODE 1 — Fixed CAT (legacy / fallback):
///         - Project Registration:   1,000 CAT  (one-time)
///         - Audit Basic:           10,000 CAT  (per audit cycle)
///         - Audit Enterprise:      50,000 CAT  (annual subscription)
///         - Compliance Basic:       5,000 CAT  (monthly)
///         - Compliance Enterprise: 25,000 CAT  (monthly)
///         - Identity Verification:    100 CAT  (per verification)
///         - Valuation Report:       5,000 CAT  (per asset)
///         - Private Offering Setup: 2% of raise in CAT (min 10,000 CAT)
///
///         MODE 2 — Dynamic MXN (oracle-backed):
///         - Every service has a MXN price (e.g. Audit Basic = $20,000 MXN)
///         - CAT required = MXN_price / CAT_MXN_rate
///         - CAT_MXN_rate comes from MXNPriceOracle (CAT_USD × USD_MXN)
///         - This means the CAT price in MXN adjusts automatically
///         - Services always cost the SAME in pesos regardless of CAT market price
///
///         Platform fees distribution:
///         - 60% → Treasury (operations, development, liquidity)
///         - 25% → FRT staking pool (reward distribution)
///         - 10% → Auditor/Validator nodes
///         -  5% → Burn (deflationary pressure on CAT)
contract ServicePricing is AccessControl, ReentrancyGuard {
    bytes32 public constant PRICING_ADMIN = keccak256("PRICING_ADMIN");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    IERC20 public catToken;
    IERC20 public frtToken;
    address public treasury;
    address public stakingPool;
    address public burnAddress = address(0xdead);

    // ── Service fee schedule (in CAT, 18 decimals) ──
    mapping(bytes32 => uint256) public serviceFees;
    mapping(address => uint256) public totalSpent;  // lifetime CAT spent per user
    mapping(address => uint256) public frtEarned;   // lifetime FRT earned per user

    // ── MXN Dynamic Pricing ──
    IMXNPriceOracle public mxnOracle;
    mapping(bytes32 => uint256) public mxnServicePrices; // service → MXN price (1e18 scaled)
    bool public useMxnPricing = false;                    // governance toggle

    // ── Fee distribution percentages (basis points) ──
    uint256 public treasuryBps = 6000;    // 60%
    uint256 public stakingBps = 2500;     // 25%
    uint256 public validatorBps = 1000;   // 10%
    uint256 public burnBps = 500;         // 5%

    // ── Events ──
    event ServicePurchased(
        address indexed buyer,
        bytes32 indexed serviceId,
        uint256 catAmount,
        uint256 timestamp
    );
    event ServicePurchasedMXN(
        address indexed buyer,
        bytes32 indexed serviceId,
        uint256 mxnPrice,
        uint256 catMxnRate,
        uint256 catAmount,
        uint256 timestamp
    );
    event ServiceFeeUpdated(bytes32 indexed serviceId, uint256 newFee);
    event MxnServicePriceUpdated(bytes32 indexed serviceId, uint256 newMxnPrice);
    event MxnPricingToggled(bool enabled);
    event MxnOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event FRTDistributed(address indexed recipient, uint256 amount);
    event FeeDistributionUpdated(uint256 treasury, uint256 staking, uint256 validator, uint256 burn);

    // ── Service IDs ──
    bytes32 public constant SERVICE_PROJECT_REGISTRATION = keccak256("project_registration");
    bytes32 public constant SERVICE_AUDIT_BASIC = keccak256("audit_basic");
    bytes32 public constant SERVICE_AUDIT_ENTERPRISE = keccak256("audit_enterprise");
    bytes32 public constant SERVICE_COMPLIANCE_BASIC = keccak256("compliance_basic");
    bytes32 public constant SERVICE_COMPLIANCE_ENTERPRISE = keccak256("compliance_enterprise");
    bytes32 public constant SERVICE_IDENTITY_VERIFICATION = keccak256("identity_verification");
    bytes32 public constant SERVICE_VALUATION_REPORT = keccak256("valuation_report");
    bytes32 public constant SERVICE_OFFERING_SETUP = keccak256("offering_setup");

    constructor(
        address catToken_,
        address frtToken_,
        address treasury_,
        address stakingPool_,
        address mxnOracle_
    ) {
        require(catToken_ != address(0), "cat token required");
        require(frtToken_ != address(0), "frt token required");
        require(treasury_ != address(0), "treasury required");
        require(stakingPool_ != address(0), "staking pool required");

        catToken = IERC20(catToken_);
        frtToken = IERC20(frtToken_);
        treasury = treasury_;
        stakingPool = stakingPool_;
        if (mxnOracle_ != address(0)) {
            mxnOracle = IMXNPriceOracle(mxnOracle_);
        }

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRICING_ADMIN, msg.sender);
        _grantRole(TREASURY_ROLE, treasury_);

        // Initialize default fees in CAT (scaled by 1e18) — MODE 1 (fixed CAT)
        serviceFees[SERVICE_PROJECT_REGISTRATION] = 1_000 ether;
        serviceFees[SERVICE_AUDIT_BASIC] = 10_000 ether;
        serviceFees[SERVICE_AUDIT_ENTERPRISE] = 50_000 ether;
        serviceFees[SERVICE_COMPLIANCE_BASIC] = 5_000 ether;
        serviceFees[SERVICE_COMPLIANCE_ENTERPRISE] = 25_000 ether;
        serviceFees[SERVICE_IDENTITY_VERIFICATION] = 100 ether;
        serviceFees[SERVICE_VALUATION_REPORT] = 5_000 ether;
        serviceFees[SERVICE_OFFERING_SETUP] = 10_000 ether; // minimum, 2% added on top

        // Initialize MXN service prices (1e18 scaled) — MODE 2 (dynamic MXN)
        // Target: 1 CAT ≈ $0.10 USD ≈ $2.00 MXN (at USD/MXN = 20)
        // So 1,000 CAT ≈ $2,000 MXN, 10,000 CAT ≈ $20,000 MXN, etc.
        mxnServicePrices[SERVICE_PROJECT_REGISTRATION] = 2_000 ether;   // $2,000 MXN
        mxnServicePrices[SERVICE_AUDIT_BASIC] = 20_000 ether;          // $20,000 MXN
        mxnServicePrices[SERVICE_AUDIT_ENTERPRISE] = 100_000 ether;    // $100,000 MXN
        mxnServicePrices[SERVICE_COMPLIANCE_BASIC] = 10_000 ether;     // $10,000 MXN
        mxnServicePrices[SERVICE_COMPLIANCE_ENTERPRISE] = 50_000 ether; // $50,000 MXN
        mxnServicePrices[SERVICE_IDENTITY_VERIFICATION] = 200 ether;    // $200 MXN
        mxnServicePrices[SERVICE_VALUATION_REPORT] = 10_000 ether;      // $10,000 MXN
        mxnServicePrices[SERVICE_OFFERING_SETUP] = 20_000 ether;        // $20,000 MXN minimum
    }

    // ── Admin: update service fee ──
    function setServiceFee(bytes32 serviceId, uint256 newFee) external onlyRole(PRICING_ADMIN) {
        serviceFees[serviceId] = newFee;
        emit ServiceFeeUpdated(serviceId, newFee);
    }

    // ── Admin: update distribution ──
    function setDistribution(uint256 _treasury, uint256 _staking, uint256 _validator, uint256 _burn)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_treasury + _staking + _validator + _burn == 10000, "must sum to 100%");
        treasuryBps = _treasury;
        stakingBps = _staking;
        validatorBps = _validator;
        burnBps = _burn;
        emit FeeDistributionUpdated(_treasury, _staking, _validator, _burn);
    }

    // ── Buy a service with CAT (MODE 1: fixed CAT prices) ──
    function purchaseService(bytes32 serviceId) external nonReentrant returns (uint256 fee) {
        fee = serviceFees[serviceId];
        require(fee > 0, "unknown service");

        // Transfer CAT from buyer to this contract
        require(catToken.transferFrom(msg.sender, address(this), fee), "CAT transfer failed");

        // Distribute fees
        _distributeFees(fee);

        totalSpent[msg.sender] += fee;

        emit ServicePurchased(msg.sender, serviceId, fee, block.timestamp);
        return fee;
    }

    // ── Purchase private offering (2% fee on raise amount, min 10k CAT) ──
    function purchaseOfferingSetup(uint256 raiseAmountCAT) external nonReentrant returns (uint256 fee) {
        fee = (raiseAmountCAT * 200) / 10000; // 2%
        uint256 minimum = serviceFees[SERVICE_OFFERING_SETUP];
        if (fee < minimum) fee = minimum;

        require(catToken.transferFrom(msg.sender, address(this), fee), "CAT transfer failed");

        _distributeFees(fee);

        totalSpent[msg.sender] += fee;
        emit ServicePurchased(msg.sender, SERVICE_OFFERING_SETUP, fee, block.timestamp);
        return fee;
    }

    // ── Distribute FRT rewards (called by admin/automation) ──
    function distributeFRT(address recipient, uint256 amount) external onlyRole(PRICING_ADMIN) {
        require(frtToken.transfer(recipient, amount), "FRT transfer failed");
        frtEarned[recipient] += amount;
        emit FRTDistributed(recipient, amount);
    }

    // ── Batch distribute FRT ──
    function batchDistributeFRT(address[] calldata recipients, uint256[] calldata amounts)
        external onlyRole(PRICING_ADMIN)
    {
        require(recipients.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(frtToken.transfer(recipients[i], amounts[i]), "FRT transfer failed");
            frtEarned[recipients[i]] += amounts[i];
            emit FRTDistributed(recipients[i], amounts[i]);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ── MODE 2: Dynamic MXN Pricing ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Set the MXN price for a service.
    /// @param serviceId The service identifier
    /// @param mxnPrice Price in MXN (1e18 scaled, e.g. $20,000 MXN = 20000e18)
    function setMxnServicePrice(bytes32 serviceId, uint256 mxnPrice)
        external onlyRole(PRICING_ADMIN)
    {
        require(mxnPrice > 0, "price required");
        mxnServicePrices[serviceId] = mxnPrice;
        emit MxnServicePriceUpdated(serviceId, mxnPrice);
    }

    /// @notice Set the MXN price oracle address.
    function setMxnOracle(address oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(oracle != address(0), "oracle required");
        emit MxnOracleUpdated(address(mxnOracle), oracle);
        mxnOracle = IMXNPriceOracle(oracle);
    }

    /// @notice Toggle between fixed CAT (MODE 1) and dynamic MXN (MODE 2).
    function setUseMxnPricing(bool enabled) external onlyRole(PRICING_ADMIN) {
        if (enabled) {
            require(address(mxnOracle) != address(0), "oracle not set");
            require(!mxnOracle.isStale(), "oracle stale");
        }
        useMxnPricing = enabled;
        emit MxnPricingToggled(enabled);
    }

    /// @notice Purchase a service paying with CAT, using MXN dynamic pricing.
    ///         Calculates CAT needed from the service's MXN price via the oracle.
    ///         This is the function that gives CAT real MXN value.
    ///
    ///         Flow:
    ///         1. Look up service MXN price (e.g. $20,000 MXN for Audit Basic)
    ///         2. Ask oracle: how many CAT for this MXN amount?
    ///         3. Transfer CAT from user
    ///         4. Distribute to Treasury / Staking / Burn
    ///
    ///         Example:
    ///         - MXN price: 20000e18 ($20,000 MXN)
    ///         - Oracle CAT/MXN: 2e18 (1 CAT = 2 MXN)
    ///         - CAT needed: 20000e18 × 1e18 / 2e18 = 10000e18 = 10,000 CAT
    function purchaseServiceWithMXN(bytes32 serviceId)
        external nonReentrant returns (uint256 catAmount)
    {
        require(useMxnPricing, "MXN pricing not active");
        require(!mxnOracle.isStale(), "oracle stale");

        uint256 mxnPrice = mxnServicePrices[serviceId];
        require(mxnPrice > 0, "no MXN price for service");

        // Get CAT amount from oracle
        catAmount = mxnOracle.getCatAmountForMxn(mxnPrice);
        require(catAmount > 0, "invalid CAT amount");

        // Get current rate for the event
        uint256 catMxnRate = mxnOracle.getCatMxnRate();

        // Transfer CAT from buyer to this contract
        require(catToken.transferFrom(msg.sender, address(this), catAmount), "CAT transfer failed");

        // Distribute fees
        _distributeFees(catAmount);

        totalSpent[msg.sender] += catAmount;

        emit ServicePurchasedMXN(msg.sender, serviceId, mxnPrice, catMxnRate, catAmount, block.timestamp);
        return catAmount;
    }

    /// @notice Purchase private offering using MXN pricing.
    /// @param raiseAmountMXN The total raise amount in MXN (1e18 scaled)
    function purchaseOfferingSetupWithMXN(uint256 raiseAmountMXN)
        external nonReentrant returns (uint256 catAmount)
    {
        require(useMxnPricing, "MXN pricing not active");
        require(!mxnOracle.isStale(), "oracle stale");

        // 2% fee on the raise amount in MXN
        uint256 mxnFee = (raiseAmountMXN * 200) / 10000; // 2%
        uint256 minimum = mxnServicePrices[SERVICE_OFFERING_SETUP];
        if (mxnFee < minimum) mxnFee = minimum;

        catAmount = mxnOracle.getCatAmountForMxn(mxnFee);
        require(catAmount > 0, "invalid CAT amount");

        uint256 catMxnRate = mxnOracle.getCatMxnRate();

        require(catToken.transferFrom(msg.sender, address(this), catAmount), "CAT transfer failed");

        _distributeFees(catAmount);

        totalSpent[msg.sender] += catAmount;

        emit ServicePurchasedMXN(msg.sender, SERVICE_OFFERING_SETUP, mxnFee, catMxnRate, catAmount, block.timestamp);
        return catAmount;
    }

    /// @notice Internal: distribute CAT fees to treasury, staking, validators, burn.
    function _distributeFees(uint256 fee) internal {
        uint256 toTreasury = (fee * treasuryBps) / 10000;
        uint256 toStaking = (fee * stakingBps) / 10000;
        uint256 toValidator = (fee * validatorBps) / 10000;
        uint256 toBurn = (fee * burnBps) / 10000;

        require(catToken.transfer(treasury, toTreasury), "treasury transfer failed");
        if (toStaking > 0) require(catToken.transfer(stakingPool, toStaking), "staking transfer failed");
        if (toValidator > 0) require(catToken.transfer(msg.sender, toValidator), "validator transfer failed");
        if (toBurn > 0) require(catToken.transfer(burnAddress, toBurn), "burn transfer failed");
    }

    /// @notice Returns the MXN price for a service (1e18 scaled).
    function getServiceMxnPrice(bytes32 serviceId) external view returns (uint256) {
        return mxnServicePrices[serviceId];
    }

    /// @notice Returns how many CAT are needed for a service at the current oracle rate.
    ///         Useful for UIs to show the user the current CAT cost before they pay.
    function getRequiredCAT(bytes32 serviceId) external view returns (uint256 catAmount) {
        uint256 mxnPrice = mxnServicePrices[serviceId];
        if (mxnPrice == 0 || address(mxnOracle) == address(0)) return 0;
        return mxnOracle.getCatAmountForMxn(mxnPrice);
    }

    /// @notice Returns the live CAT/MXN rate from the oracle (or 0 if no oracle).
    function getLiveCatMxnRate() external view returns (uint256) {
        if (address(mxnOracle) == address(0)) return 0;
        return mxnOracle.getCatMxnRate();
    }

    // ── View functions ──
    function getServiceFee(bytes32 serviceId) external view returns (uint256) {
        return serviceFees[serviceId];
    }

    function getUserStats(address user) external view returns (uint256 spent, uint256 earned) {
        return (totalSpent[user], frtEarned[user]);
    }

    function getTotalBurned() external view returns (uint256) {
        return catToken.balanceOf(burnAddress);
    }

    /// @notice Calculates CAT price in USD based on platform TVL and demand.
    ///         Formula: CAT_price_USD = (total_CAT_locked_in_services * avg_service_USD)
    ///                                  / circulating_supply
    function estimateCATValue(
        uint256 totalCATLocked,
        uint256 avgServiceUSD,  // e.g., 5000 * 1e18 for $5,000 avg service price
        uint256 circulatingSupply
    ) public pure returns (uint256 catPriceUSD) {
        if (circulatingSupply == 0) return 0;
        catPriceUSD = (totalCATLocked * avgServiceUSD) / circulatingSupply;
        return catPriceUSD;
    }

    /// @notice Calculates CAT price in MXN using the oracle rate.
    ///         Combines the TVL-based USD estimate with the live USD/MXN rate.
    function estimateCATValueMXN(
        uint256 totalCATLocked,
        uint256 avgServiceUSD,
        uint256 circulatingSupply
    ) external view returns (uint256 catPriceMXN) {
        uint256 catPriceUSD = estimateCATValue(totalCATLocked, avgServiceUSD, circulatingSupply);
        if (catPriceUSD == 0 || address(mxnOracle) == address(0)) return 0;
        // CAT_MXN = CAT_USD × USD_MXN / PRECISION
        uint256 usdMxn = mxnOracle.getUsdMxnRate();
        return (catPriceUSD * usdMxn) / 1e18;
    }
}
