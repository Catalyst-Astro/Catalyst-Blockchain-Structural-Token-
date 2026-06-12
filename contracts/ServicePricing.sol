// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title ServicePricing
/// @notice Pricing engine for Catalyst platform services.
///         CAT token = utility token to pay for audits, project registration,
///         compliance, and governance. FRT = reward token for platform activity.
///
///         THIS IS WHAT GIVES CAT AND FRT REAL VALUE.
///
///         Services priced in CAT:
///         - Project Registration:   1,000 CAT  (one-time)
///         - Audit Basic:           10,000 CAT  (per audit cycle)
///         - Audit Enterprise:      50,000 CAT  (annual subscription)
///         - Compliance Basic:       5,000 CAT  (monthly)
///         - Compliance Enterprise: 25,000 CAT  (monthly)
///         - Identity Verification:    100 CAT  (per verification)
///         - Valuation Report:       5,000 CAT  (per asset)
///         - Private Offering Setup: 2% of raise in CAT (min 10,000 CAT)
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
    event ServiceFeeUpdated(bytes32 indexed serviceId, uint256 newFee);
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

    constructor(address catToken_, address frtToken_, address treasury_, address stakingPool_) {
        require(catToken_ != address(0), "cat token required");
        require(frtToken_ != address(0), "frt token required");
        require(treasury_ != address(0), "treasury required");
        require(stakingPool_ != address(0), "staking pool required");

        catToken = IERC20(catToken_);
        frtToken = IERC20(frtToken_);
        treasury = treasury_;
        stakingPool = stakingPool_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRICING_ADMIN, msg.sender);
        _grantRole(TREASURY_ROLE, treasury_);

        // Initialize default fees (scaled by 1e18)
        serviceFees[SERVICE_PROJECT_REGISTRATION] = 1_000 ether;
        serviceFees[SERVICE_AUDIT_BASIC] = 10_000 ether;
        serviceFees[SERVICE_AUDIT_ENTERPRISE] = 50_000 ether;
        serviceFees[SERVICE_COMPLIANCE_BASIC] = 5_000 ether;
        serviceFees[SERVICE_COMPLIANCE_ENTERPRISE] = 25_000 ether;
        serviceFees[SERVICE_IDENTITY_VERIFICATION] = 100 ether;
        serviceFees[SERVICE_VALUATION_REPORT] = 5_000 ether;
        serviceFees[SERVICE_OFFERING_SETUP] = 10_000 ether; // minimum, 2% added on top
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

    // ── Buy a service with CAT ──
    function purchaseService(bytes32 serviceId) external nonReentrant returns (uint256 fee) {
        fee = serviceFees[serviceId];
        require(fee > 0, "unknown service");

        // Transfer CAT from buyer to this contract
        require(catToken.transferFrom(msg.sender, address(this), fee), "CAT transfer failed");

        // Distribute fees
        uint256 toTreasury = (fee * treasuryBps) / 10000;
        uint256 toStaking = (fee * stakingBps) / 10000;
        uint256 toValidator = (fee * validatorBps) / 10000;
        uint256 toBurn = (fee * burnBps) / 10000;

        require(catToken.transfer(treasury, toTreasury), "treasury transfer failed");
        if (toStaking > 0) require(catToken.transfer(stakingPool, toStaking), "staking transfer failed");
        if (toValidator > 0) require(catToken.transfer(msg.sender, toValidator), "validator transfer failed");
        if (toBurn > 0) require(catToken.transfer(burnAddress, toBurn), "burn transfer failed");

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

        uint256 toTreasury = (fee * treasuryBps) / 10000;
        uint256 toStaking = (fee * stakingBps) / 10000;
        uint256 toBurn = (fee * burnBps) / 10000;

        require(catToken.transfer(treasury, toTreasury), "treasury transfer failed");
        if (toStaking > 0) require(catToken.transfer(stakingPool, toStaking), "staking transfer failed");
        if (toBurn > 0) require(catToken.transfer(burnAddress, toBurn), "burn transfer failed");

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
    ///         This is an on-chain oracle stub — real implementation uses
    ///         FiduciaryOracle.sol or Chainlink price feeds.
    ///         Formula: CAT_price_USD = (total_CAT_locked_in_services * avg_service_USD)
    ///                                  / circulating_supply
    function estimateCATValue(
        uint256 totalCATLocked,
        uint256 avgServiceUSD,  // e.g., 5000 * 1e18 for $5,000 avg service price
        uint256 circulatingSupply
    ) external pure returns (uint256 catPriceUSD) {
        if (circulatingSupply == 0) return 0;
        catPriceUSD = (totalCATLocked * avgServiceUSD) / circulatingSupply;
        return catPriceUSD;
    }
}
