// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title DisclosureRegistry
/// @notice Stores versioned disclosure bundle hashes and active version.
contract DisclosureRegistry is AccessControl {
    bytes32 public constant DISCLOSURE_ADMIN_ROLE = keccak256("DISCLOSURE_ADMIN");

    struct DisclosureVersion {
        bytes32 documentHash;
        uint64 publishedAt;
        bool active;
    }

    uint256 public latestVersion;
    uint256 public activeVersion;
    mapping(uint256 => DisclosureVersion) public disclosures;

    event DisclosurePublished(uint256 indexed versionId, bytes32 indexed documentHash, uint64 timestamp);
    event DisclosureActivated(uint256 indexed versionId, bytes32 indexed documentHash, uint64 timestamp);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DISCLOSURE_ADMIN_ROLE, admin);
        _setRoleAdmin(DISCLOSURE_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /// @notice Publish a new disclosure bundle hash and return its version id.
    function publishDisclosure(bytes32 documentHash) external onlyRole(DISCLOSURE_ADMIN_ROLE) returns (uint256) {
        require(documentHash != bytes32(0), "hash required");
        latestVersion += 1;
        disclosures[latestVersion] = DisclosureVersion({
            documentHash: documentHash,
            publishedAt: uint64(block.timestamp),
            active: false
        });
        emit DisclosurePublished(latestVersion, documentHash, uint64(block.timestamp));
        return latestVersion;
    }

    /// @notice Activate an existing disclosure version.
    function activateDisclosure(uint256 versionId) external onlyRole(DISCLOSURE_ADMIN_ROLE) {
        DisclosureVersion storage version = disclosures[versionId];
        require(version.documentHash != bytes32(0), "unknown version");
        if (activeVersion != 0) {
            disclosures[activeVersion].active = false;
        }
        activeVersion = versionId;
        version.active = true;
        emit DisclosureActivated(versionId, version.documentHash, uint64(block.timestamp));
    }
}
