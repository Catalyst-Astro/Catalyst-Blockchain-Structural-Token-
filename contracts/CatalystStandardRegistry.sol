// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CatalystStandardRegistry
/// @notice Registers Catalyst standard versions and evidence hashes.
contract CatalystStandardRegistry is AccessControl {
    bytes32 public constant STANDARD_ADMIN = keccak256("STANDARD_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Standard {
        bytes32 doctrineHash;
        bytes32 specHash;
        bytes32 standardHash;
        uint64 timestamp;
        uint32 version;
        bool exists;
    }

    mapping(uint32 => Standard) private standards;
    uint32 private activeVersion;
    uint32 private nextVersion;

    event StandardPublished(uint32 version, bytes32 doctrineHash, bytes32 specHash, bytes32 standardHash);
    event StandardActivated(uint32 version);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(STANDARD_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(STANDARD_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishStandard(bytes32 doctrineHash, bytes32 specHash, bytes32 standardHash)
        external
        onlyRole(STANDARD_ADMIN)
        returns (uint32 version)
    {
        require(doctrineHash != bytes32(0), "doctrine hash required");
        require(specHash != bytes32(0), "spec hash required");
        require(standardHash != bytes32(0), "standard hash required");
        version = nextVersion + 1;
        nextVersion = version;
        standards[version] = Standard({
            doctrineHash: doctrineHash,
            specHash: specHash,
            standardHash: standardHash,
            timestamp: uint64(block.timestamp),
            version: version,
            exists: true
        });
        emit StandardPublished(version, doctrineHash, specHash, standardHash);
    }

    function activateStandard(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(standards[version].exists, "standard missing");
        activeVersion = version;
        emit StandardActivated(version);
    }

    function activeStandardVersion() external view returns (uint32) {
        return activeVersion;
    }

    function standardOf(uint32 version) external view returns (Standard memory) {
        return standards[version];
    }

    function isStandardActive(uint32 version) external view returns (bool) {
        return version != 0 && version == activeVersion;
    }
}
