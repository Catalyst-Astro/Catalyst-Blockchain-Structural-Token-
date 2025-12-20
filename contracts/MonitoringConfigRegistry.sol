// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAutoActionPolicy.sol";

/// @title MonitoringConfigRegistry
/// @notice Stores monitoring rules and thresholds without PII.
contract MonitoringConfigRegistry is AccessControl {
    bytes32 public constant MONITORING_ADMIN = keccak256("MONITORING_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Rule {
        bytes32 ruleHash;
        IAutoActionPolicy.Severity severity;
        uint32 version;
        bool active;
    }

    struct Threshold {
        uint256 maxAmount;
        uint32 maxTx;
        bool exists;
    }

    mapping(bytes32 => mapping(uint32 => Rule)) private rules;
    mapping(bytes32 => uint32) private activeVersion;
    mapping(bytes32 => uint32) private nextVersion;
    mapping(bytes32 => mapping(uint8 => mapping(bytes32 => Threshold))) private thresholds;

    event RulePublished(bytes32 indexed ruleId, uint32 version, bytes32 ruleHash, IAutoActionPolicy.Severity severity);
    event RuleActivated(bytes32 indexed ruleId, uint32 version);
    event ThresholdSet(bytes32 indexed ruleId, uint8 riskLevel, bytes32 indexed jurisdiction, uint256 maxAmount, uint32 maxTx);

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

    function publishRule(bytes32 ruleId, bytes32 ruleHash, IAutoActionPolicy.Severity severity)
        external
        onlyRole(MONITORING_ADMIN)
        returns (uint32 version)
    {
        require(ruleId != bytes32(0), "rule id required");
        require(ruleHash != bytes32(0), "rule hash required");
        version = nextVersion[ruleId] + 1;
        nextVersion[ruleId] = version;
        rules[ruleId][version] = Rule({ruleHash: ruleHash, severity: severity, version: version, active: false});
        emit RulePublished(ruleId, version, ruleHash, severity);
    }

    function activateRule(bytes32 ruleId, uint32 version) external onlyRole(DAO_COUNCIL) {
        Rule storage rule = rules[ruleId][version];
        require(rule.ruleHash != bytes32(0), "rule missing");
        activeVersion[ruleId] = version;
        rule.active = true;
        emit RuleActivated(ruleId, version);
    }

    function setThreshold(bytes32 ruleId, uint8 riskLevel, bytes32 jurisdiction, uint256 maxAmount, uint32 maxTx)
        external
        onlyRole(MONITORING_ADMIN)
    {
        require(ruleId != bytes32(0), "rule id required");
        thresholds[ruleId][riskLevel][jurisdiction] = Threshold({
            maxAmount: maxAmount,
            maxTx: maxTx,
            exists: true
        });
        emit ThresholdSet(ruleId, riskLevel, jurisdiction, maxAmount, maxTx);
    }

    function activeRule(bytes32 ruleId) external view returns (Rule memory) {
        uint32 version = activeVersion[ruleId];
        return rules[ruleId][version];
    }

    function ruleOf(bytes32 ruleId, uint32 version) external view returns (Rule memory) {
        return rules[ruleId][version];
    }

    function thresholdOf(bytes32 ruleId, uint8 riskLevel, bytes32 jurisdiction) external view returns (Threshold memory) {
        return thresholds[ruleId][riskLevel][jurisdiction];
    }
}
