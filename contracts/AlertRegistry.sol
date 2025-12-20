// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAutoActionPolicy.sol";
import "./interfaces/IRiskScoreRegistry.sol";

/// @title AlertRegistry
/// @notice Records monitoring alerts and optional auto-actions.
contract AlertRegistry is AccessControl {
    bytes32 public constant MONITORING_ADMIN = keccak256("MONITORING_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    enum Status {
        OPEN,
        CLOSED
    }

    struct Alert {
        address wallet;
        bytes32 entityId;
        IAutoActionPolicy.Severity severity;
        bytes32 ruleHash;
        uint64 timestamp;
        Status status;
        bytes32 resolutionHash;
    }

    mapping(bytes32 => Alert) private alerts;

    IAutoActionPolicy public actionPolicy;
    IRiskScoreRegistry public riskScoreRegistry;
    bool public autoActionsEnabled;

    event AlertRaised(
        bytes32 indexed alertId,
        address indexed wallet,
        bytes32 indexed entityId,
        IAutoActionPolicy.Severity severity,
        bytes32 ruleHash,
        uint64 timestamp
    );
    event AlertClosed(bytes32 indexed alertId, bytes32 resolutionHash, uint64 timestamp);
    event AutoActionsEnabled(bool enabled);
    event ActionPolicySet(address indexed policy);
    event RiskScoreRegistrySet(address indexed registry);
    event AutoActionExecuted(
        bytes32 indexed alertId,
        IAutoActionPolicy.ActionType action,
        uint8 targetRiskLevel,
        uint64 validUntil
    );

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MONITORING_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(MONITORING_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, MONITORING_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function setActionPolicy(address policy) external onlyRole(MONITORING_ADMIN) {
        actionPolicy = IAutoActionPolicy(policy);
        emit ActionPolicySet(policy);
    }

    function setRiskScoreRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        riskScoreRegistry = IRiskScoreRegistry(registry);
        emit RiskScoreRegistrySet(registry);
    }

    function setAutoActionsEnabled(bool enabled) external onlyRole(DAO_COUNCIL) {
        autoActionsEnabled = enabled;
        emit AutoActionsEnabled(enabled);
    }

    function raiseAlert(
        bytes32 alertId,
        address wallet,
        bytes32 entityId,
        IAutoActionPolicy.Severity severity,
        bytes32 ruleHash
    ) external {
        require(
            hasRole(MONITORING_ADMIN, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender),
            "not authorized"
        );
        require(alertId != bytes32(0), "alert id required");
        require(ruleHash != bytes32(0), "rule hash required");
        require(wallet != address(0) || entityId != bytes32(0), "subject required");
        require(alerts[alertId].timestamp == 0, "alert exists");

        alerts[alertId] = Alert({
            wallet: wallet,
            entityId: entityId,
            severity: severity,
            ruleHash: ruleHash,
            timestamp: uint64(block.timestamp),
            status: Status.OPEN,
            resolutionHash: bytes32(0)
        });

        emit AlertRaised(alertId, wallet, entityId, severity, ruleHash, uint64(block.timestamp));

        if (autoActionsEnabled) {
            _applyAutoAction(alertId, wallet, entityId, severity, ruleHash);
        }
    }

    function closeAlert(bytes32 alertId, bytes32 resolutionHash) external onlyRole(COMPLIANCE_ADMIN) {
        Alert storage alertInfo = alerts[alertId];
        require(alertInfo.timestamp != 0, "alert missing");
        require(alertInfo.status == Status.OPEN, "already closed");
        alertInfo.status = Status.CLOSED;
        alertInfo.resolutionHash = resolutionHash;
        emit AlertClosed(alertId, resolutionHash, uint64(block.timestamp));
    }

    function alertOf(bytes32 alertId) external view returns (Alert memory) {
        return alerts[alertId];
    }

    function _applyAutoAction(
        bytes32 alertId,
        address wallet,
        bytes32 entityId,
        IAutoActionPolicy.Severity severity,
        bytes32 ruleHash
    ) internal {
        require(address(actionPolicy) != address(0), "action policy not set");
        IAutoActionPolicy.ActionPolicy memory policy = actionPolicy.activePolicy(severity);
        if (!policy.exists || policy.action == IAutoActionPolicy.ActionType.NONE) {
            return;
        }

        require(address(riskScoreRegistry) != address(0), "risk registry not set");
        require(policy.targetRiskLevel <= uint8(IRiskScoreRegistry.RiskLevel.HIGH), "invalid risk level");

        uint64 validTo = policy.validForSeconds == 0 ? 0 : uint64(block.timestamp + policy.validForSeconds);
        bytes32 justificationHash = keccak256(abi.encodePacked(alertId, ruleHash));

        if (entityId != bytes32(0)) {
            riskScoreRegistry.setEntityScore(
                entityId,
                IRiskScoreRegistry.RiskLevel(policy.targetRiskLevel),
                policy.version,
                0,
                validTo,
                justificationHash
            );
        } else {
            riskScoreRegistry.setWalletScore(
                wallet,
                IRiskScoreRegistry.RiskLevel(policy.targetRiskLevel),
                policy.version,
                0,
                validTo,
                justificationHash
            );
        }

        emit AutoActionExecuted(alertId, policy.action, policy.targetRiskLevel, validTo);
    }
}
