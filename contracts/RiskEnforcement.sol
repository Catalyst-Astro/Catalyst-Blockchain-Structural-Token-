// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IRiskScoreRegistry.sol";
import "./interfaces/IRiskPolicyRegistry.sol";
import "./interfaces/IComplianceGate.sol";
import "./interfaces/IEntityRegistry.sol";

/// @title RiskEnforcement
/// @notice Enforces risk-based limits using score and policy registries.
contract RiskEnforcement is AccessControl {
    bytes32 public constant RISK_ADMIN = keccak256("RISK_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");

    uint256 public constant ACTION_RECEIVE = 1 << 0;
    uint256 public constant ACTION_TRANSFER = 1 << 1;
    uint256 public constant ACTION_CLAIM = 1 << 2;
    uint256 public constant ACTION_VOTE = 1 << 3;
    uint256 public constant ACTION_STAKE = 1 << 4;

    IRiskScoreRegistry public scoreRegistry;
    IRiskPolicyRegistry public policyRegistry;
    IEntityRegistry public entityRegistry;
    IComplianceGate public complianceGate;

    struct Usage {
        uint64 windowStart;
        uint64 txCount;
        uint256 amountUsed;
    }

    mapping(bytes32 => mapping(uint256 => Usage)) private usage;

    event ScoreRegistrySet(address indexed registry);
    event PolicyRegistrySet(address indexed registry);
    event EntityRegistrySet(address indexed registry);
    event ComplianceGateSet(address indexed gate);
    event QuotaConsumed(
        address indexed wallet,
        bytes32 indexed subjectId,
        uint256 action,
        uint256 amount,
        uint256 amountUsed,
        uint64 txCount,
        uint64 windowStart
    );

    constructor(address admin, address scoreRegistry_, address policyRegistry_) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RISK_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(ENFORCER_ROLE, admin);
        _setRoleAdmin(RISK_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, RISK_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ENFORCER_ROLE, RISK_ADMIN);

        scoreRegistry = IRiskScoreRegistry(scoreRegistry_);
        policyRegistry = IRiskPolicyRegistry(policyRegistry_);
        emit ScoreRegistrySet(scoreRegistry_);
        emit PolicyRegistrySet(policyRegistry_);
    }

    function setScoreRegistry(address registry) external onlyRole(RISK_ADMIN) {
        scoreRegistry = IRiskScoreRegistry(registry);
        emit ScoreRegistrySet(registry);
    }

    function setPolicyRegistry(address registry) external onlyRole(RISK_ADMIN) {
        policyRegistry = IRiskPolicyRegistry(registry);
        emit PolicyRegistrySet(registry);
    }

    function setEntityRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        entityRegistry = IEntityRegistry(registry);
        emit EntityRegistrySet(registry);
    }

    function setComplianceGate(address gate) external onlyRole(COMPLIANCE_ADMIN) {
        complianceGate = IComplianceGate(gate);
        emit ComplianceGateSet(gate);
    }

    function checkLimits(address wallet, uint256 action, uint256 amount) public view {
        require(action != 0, "action required");
        (bytes32 subjectId, IRiskPolicyRegistry.Policy memory policy) = _resolvePolicy(wallet);

        require((policy.allowedActions & action) != 0, "action not allowed");
        Usage memory current = _usageFor(subjectId, action, policy.periodSeconds);

        if (policy.maxAmountPerPeriod > 0) {
            require(current.amountUsed + amount <= policy.maxAmountPerPeriod, "amount limit exceeded");
        }
        if (policy.maxTxPerPeriod > 0) {
            require(current.txCount + 1 <= policy.maxTxPerPeriod, "tx limit exceeded");
        }
    }

    function consumeQuota(address wallet, uint256 action, uint256 amount) external onlyRole(ENFORCER_ROLE) {
        require(action != 0, "action required");
        (bytes32 subjectId, IRiskPolicyRegistry.Policy memory policy) = _resolvePolicy(wallet);

        require((policy.allowedActions & action) != 0, "action not allowed");
        Usage storage current = usage[subjectId][action];
        uint64 windowStart = _currentWindowStart(policy.periodSeconds);

        if (current.windowStart != windowStart) {
            current.windowStart = windowStart;
            current.amountUsed = 0;
            current.txCount = 0;
        }

        if (policy.maxAmountPerPeriod > 0) {
            require(current.amountUsed + amount <= policy.maxAmountPerPeriod, "amount limit exceeded");
            current.amountUsed += amount;
        }
        if (policy.maxTxPerPeriod > 0) {
            require(current.txCount + 1 <= policy.maxTxPerPeriod, "tx limit exceeded");
            current.txCount += 1;
        }

        emit QuotaConsumed(wallet, subjectId, action, amount, current.amountUsed, current.txCount, current.windowStart);
    }

    function usageOf(address wallet, uint256 action)
        external
        view
        returns (uint64 windowStart, uint256 amountUsed, uint64 txCount)
    {
        bytes32 subjectId = _subjectIdFor(wallet);
        Usage storage current = usage[subjectId][action];
        return (current.windowStart, current.amountUsed, current.txCount);
    }

    function _resolvePolicy(address wallet)
        internal
        view
        returns (bytes32 subjectId, IRiskPolicyRegistry.Policy memory policy)
    {
        require(wallet != address(0), "wallet required");
        require(address(scoreRegistry) != address(0), "score registry not set");
        require(address(policyRegistry) != address(0), "policy registry not set");
        if (address(complianceGate) != address(0)) {
            complianceGate.validate(wallet);
        }

        subjectId = _subjectIdFor(wallet);
        require(scoreRegistry.isScoreActiveSubject(subjectId), "risk score inactive");

        (IRiskScoreRegistry.RiskLevel level, , , , ) = scoreRegistry.scoreOfSubject(subjectId);
        policy = policyRegistry.activePolicy(level);
        require(policy.exists, "policy not set");
    }

    function _usageFor(bytes32 subjectId, uint256 action, uint32 periodSeconds)
        internal
        view
        returns (Usage memory)
    {
        Usage memory current = usage[subjectId][action];
        uint64 windowStart = _currentWindowStart(periodSeconds);
        if (current.windowStart != windowStart) {
            current.windowStart = windowStart;
            current.amountUsed = 0;
            current.txCount = 0;
        }
        return current;
    }

    function _currentWindowStart(uint32 periodSeconds) internal view returns (uint64) {
        if (periodSeconds == 0) {
            return 0;
        }
        return uint64(block.timestamp - (block.timestamp % periodSeconds));
    }

    function _subjectIdFor(address wallet) internal view returns (bytes32) {
        if (address(entityRegistry) != address(0)) {
            bytes32 entityId = entityRegistry.entityOf(wallet);
            if (entityId != bytes32(0)) {
                return entityId;
            }
        }
        return bytes32(uint256(uint160(wallet)));
    }
}
