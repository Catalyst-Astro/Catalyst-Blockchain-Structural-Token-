// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IAutoActionPolicy.sol";

/// @title AutoActionPolicy
/// @notice Versioned policies mapping alert severities to automated actions.
contract AutoActionPolicy is AccessControl, IAutoActionPolicy {
    bytes32 public constant MONITORING_ADMIN = keccak256("MONITORING_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    mapping(Severity => mapping(uint32 => ActionPolicy)) private policies;
    mapping(Severity => uint32) private activeVersion;
    mapping(Severity => uint32) private nextVersion;

    event ActionPolicyPublished(Severity severity, uint32 version, bytes32 policyHash);
    event ActionPolicyActivated(Severity severity, uint32 version);

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

    function publishPolicy(
        Severity severity,
        ActionType action,
        uint8 targetRiskLevel,
        uint64 validForSeconds,
        bytes32 policyHash
    ) external onlyRole(MONITORING_ADMIN) returns (uint32 version) {
        version = nextVersion[severity] + 1;
        nextVersion[severity] = version;
        policies[severity][version] = ActionPolicy({
            action: action,
            targetRiskLevel: targetRiskLevel,
            validForSeconds: validForSeconds,
            version: version,
            policyHash: policyHash,
            exists: true
        });
        emit ActionPolicyPublished(severity, version, policyHash);
    }

    function activatePolicy(Severity severity, uint32 version) external onlyRole(DAO_COUNCIL) {
        require(policies[severity][version].exists, "policy missing");
        activeVersion[severity] = version;
        emit ActionPolicyActivated(severity, version);
    }

    function activePolicy(Severity severity) external view returns (ActionPolicy memory) {
        uint32 version = activeVersion[severity];
        return policies[severity][version];
    }

    function policyOf(Severity severity, uint32 version) external view returns (ActionPolicy memory) {
        return policies[severity][version];
    }
}
