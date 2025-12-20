// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title JurisdictionPolicyRegistry
/// @notice Versioned jurisdiction allow/deny rules by series.
contract JurisdictionPolicyRegistry is AccessControl {
    bytes32 public constant SERIES_ADMIN = keccak256("SERIES_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Policy {
        bytes32 policyHash;
        uint32 version;
        bool exists;
    }

    mapping(uint32 => Policy) private policies;
    mapping(uint32 => mapping(bytes32 => mapping(bytes32 => bool))) private allowlist;
    mapping(uint32 => mapping(bytes32 => mapping(bytes32 => bool))) private denylist;
    mapping(uint32 => mapping(bytes32 => mapping(bytes32 => bool))) private specialHandling;
    mapping(uint32 => mapping(bytes32 => bool)) private allowlistActive;
    uint32 private activeVersion;
    uint32 private nextVersion;

    event JurisdictionPolicyPublished(uint32 version, bytes32 policyHash);
    event JurisdictionPolicyActivated(uint32 version);
    event JurisdictionAllowlistSet(uint32 version, bytes32 indexed seriesId, bytes32 indexed jurisdiction, bool allowed);
    event JurisdictionDenylistSet(uint32 version, bytes32 indexed seriesId, bytes32 indexed jurisdiction, bool denied);
    event JurisdictionSpecialHandlingSet(
        uint32 version,
        bytes32 indexed seriesId,
        bytes32 indexed jurisdiction,
        bool enabled
    );

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SERIES_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(SERIES_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, SERIES_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishPolicy(bytes32 policyHash) external onlyRole(SERIES_ADMIN) returns (uint32 version) {
        require(policyHash != bytes32(0), "policy hash required");
        version = nextVersion + 1;
        nextVersion = version;
        policies[version] = Policy({policyHash: policyHash, version: version, exists: true});
        emit JurisdictionPolicyPublished(version, policyHash);
    }

    function activatePolicy(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(policies[version].exists, "policy missing");
        activeVersion = version;
        emit JurisdictionPolicyActivated(version);
    }

    function setAllowlist(uint32 version, bytes32 seriesId, bytes32 jurisdiction, bool allowed)
        external
        onlyRole(SERIES_ADMIN)
    {
        require(policies[version].exists, "policy missing");
        allowlist[version][seriesId][jurisdiction] = allowed;
        if (allowed) {
            allowlistActive[version][seriesId] = true;
        }
        emit JurisdictionAllowlistSet(version, seriesId, jurisdiction, allowed);
    }

    function setDenylist(uint32 version, bytes32 seriesId, bytes32 jurisdiction, bool denied)
        external
        onlyRole(SERIES_ADMIN)
    {
        require(policies[version].exists, "policy missing");
        denylist[version][seriesId][jurisdiction] = denied;
        emit JurisdictionDenylistSet(version, seriesId, jurisdiction, denied);
    }

    function setSpecialHandling(uint32 version, bytes32 seriesId, bytes32 jurisdiction, bool enabled)
        external
        onlyRole(SERIES_ADMIN)
    {
        require(policies[version].exists, "policy missing");
        specialHandling[version][seriesId][jurisdiction] = enabled;
        emit JurisdictionSpecialHandlingSet(version, seriesId, jurisdiction, enabled);
    }

    function isJurisdictionAllowed(uint32 version, bytes32 seriesId, bytes32 jurisdiction)
        external
        view
        returns (bool)
    {
        if (jurisdiction == bytes32(0)) {
            return true;
        }

        if (_isDenied(version, seriesId, jurisdiction)) {
            return false;
        }

        bool hasAllowlist = allowlistActive[version][seriesId] || allowlistActive[version][bytes32(0)];
        if (!hasAllowlist) {
            return true;
        }

        return allowlist[version][seriesId][jurisdiction] || allowlist[version][bytes32(0)][jurisdiction];
    }

    function isSpecialHandling(uint32 version, bytes32 seriesId, bytes32 jurisdiction) external view returns (bool) {
        if (jurisdiction == bytes32(0)) {
            return false;
        }
        return specialHandling[version][seriesId][jurisdiction] || specialHandling[version][bytes32(0)][jurisdiction];
    }

    function activePolicy() external view returns (Policy memory) {
        return policies[activeVersion];
    }

    function activePolicyVersion() external view returns (uint32) {
        return activeVersion;
    }

    function policyOf(uint32 version) external view returns (Policy memory) {
        return policies[version];
    }

    function _isDenied(uint32 version, bytes32 seriesId, bytes32 jurisdiction) internal view returns (bool) {
        return denylist[version][seriesId][jurisdiction] || denylist[version][bytes32(0)][jurisdiction];
    }
}
