// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IRiskPolicyRegistry.sol";

/// @title RiskPolicyRegistry
/// @notice Stores risk-based limit policies with versioning.
contract RiskPolicyRegistry is AccessControl, IRiskPolicyRegistry {
    bytes32 public constant RISK_ADMIN = keccak256("RISK_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    mapping(IRiskScoreRegistry.RiskLevel => mapping(uint32 => Policy)) private policies;
    mapping(IRiskScoreRegistry.RiskLevel => uint32) private activeVersion;
    mapping(IRiskScoreRegistry.RiskLevel => uint32) private nextVersion;

    event RiskPolicyPublished(IRiskScoreRegistry.RiskLevel level, uint32 version, bytes32 policyHash);
    event RiskPolicyActivated(IRiskScoreRegistry.RiskLevel level, uint32 version);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RISK_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(RISK_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, RISK_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishPolicy(
        IRiskScoreRegistry.RiskLevel level,
        uint256 maxAmountPerPeriod,
        uint32 maxTxPerPeriod,
        uint32 periodSeconds,
        uint256 allowedActions,
        bytes32 policyHash
    ) external returns (uint32 version) {
        _requirePolicyPublisher();
        version = nextVersion[level] + 1;
        nextVersion[level] = version;

        policies[level][version] = Policy({
            maxAmountPerPeriod: maxAmountPerPeriod,
            maxTxPerPeriod: maxTxPerPeriod,
            periodSeconds: periodSeconds,
            allowedActions: allowedActions,
            version: version,
            policyHash: policyHash,
            exists: true
        });

        emit RiskPolicyPublished(level, version, policyHash);
    }

    function activatePolicy(IRiskScoreRegistry.RiskLevel level, uint32 version) external {
        _requirePolicyActivator();
        require(policies[level][version].exists, "policy missing");
        activeVersion[level] = version;
        emit RiskPolicyActivated(level, version);
    }

    function activePolicy(IRiskScoreRegistry.RiskLevel level) external view returns (Policy memory) {
        uint32 version = activeVersion[level];
        return policies[level][version];
    }

    function activePolicyVersion(IRiskScoreRegistry.RiskLevel level) external view returns (uint32) {
        return activeVersion[level];
    }

    function policyOf(IRiskScoreRegistry.RiskLevel level, uint32 version) external view returns (Policy memory) {
        return policies[level][version];
    }

    function _requirePolicyPublisher() internal view {
        require(
            hasRole(RISK_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender),
            "not authorized"
        );
    }

    function _requirePolicyActivator() internal view {
        require(
            hasRole(DAO_COUNCIL, msg.sender) || hasRole(RISK_ADMIN, msg.sender),
            "not authorized"
        );
    }
}
