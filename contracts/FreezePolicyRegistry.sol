// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title FreezePolicyRegistry
/// @notice Versioned policies describing freeze triggers and limits.
contract FreezePolicyRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct FreezePolicy {
        uint64 maxDurationSeconds;
        bool requiresDaoRatification;
        bool oracleAllowed;
        bool emergencyOnly;
        bool exists;
    }

    struct PolicyVersion {
        bytes32 policyHash;
        uint32 version;
        bool exists;
    }

    mapping(uint32 => PolicyVersion) private versions;
    mapping(uint32 => mapping(uint8 => FreezePolicy)) private freezePolicies;
    uint32 private activeVersion;
    uint32 private nextVersion;

    event FreezePolicyPublished(uint32 version, bytes32 policyHash);
    event FreezePolicyActivated(uint32 version);
    event FreezeTypePolicySet(
        uint32 version,
        uint8 freezeTypeCode,
        uint64 maxDurationSeconds,
        bool requiresDaoRatification,
        bool oracleAllowed,
        bool emergencyOnly
    );

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishPolicy(bytes32 policyHash) external onlyRole(COMPLIANCE_ADMIN) returns (uint32 version) {
        require(policyHash != bytes32(0), "policy hash required");
        version = nextVersion + 1;
        nextVersion = version;
        versions[version] = PolicyVersion({policyHash: policyHash, version: version, exists: true});
        emit FreezePolicyPublished(version, policyHash);
    }

    function activatePolicy(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(versions[version].exists, "policy missing");
        activeVersion = version;
        emit FreezePolicyActivated(version);
    }

    function setFreezeTypePolicy(
        uint32 version,
        uint8 freezeTypeCode,
        uint64 maxDurationSeconds,
        bool requiresDaoRatification,
        bool oracleAllowed,
        bool emergencyOnly
    ) external onlyRole(COMPLIANCE_ADMIN) {
        require(versions[version].exists, "policy missing");
        freezePolicies[version][freezeTypeCode] = FreezePolicy({
            maxDurationSeconds: maxDurationSeconds,
            requiresDaoRatification: requiresDaoRatification,
            oracleAllowed: oracleAllowed,
            emergencyOnly: emergencyOnly,
            exists: true
        });
        emit FreezeTypePolicySet(
            version,
            freezeTypeCode,
            maxDurationSeconds,
            requiresDaoRatification,
            oracleAllowed,
            emergencyOnly
        );
    }

    function activePolicyVersion() external view returns (uint32) {
        return activeVersion;
    }

    function policyVersion(uint32 version) external view returns (PolicyVersion memory) {
        return versions[version];
    }

    function freezePolicyOf(uint32 version, uint8 freezeTypeCode) external view returns (FreezePolicy memory) {
        return freezePolicies[version][freezeTypeCode];
    }
}
