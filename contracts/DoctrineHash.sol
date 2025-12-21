// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title DoctrineHash
/// @notice Anchors doctrine hashes for long term reference.
contract DoctrineHash is AccessControl {
    bytes32 public constant DOCTRINE_ADMIN = keccak256("DOCTRINE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Doctrine {
        bytes32 doctrineHash;
        bytes32 metadataHash;
        uint64 timestamp;
        uint32 version;
        bool exists;
    }

    mapping(uint32 => Doctrine) private doctrines;
    uint32 private activeVersion;
    uint32 private nextVersion;

    event DoctrinePublished(uint32 version, bytes32 doctrineHash, bytes32 metadataHash);
    event DoctrineActivated(uint32 version);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DOCTRINE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(DOCTRINE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishDoctrine(bytes32 doctrineHash, bytes32 metadataHash)
        external
        onlyRole(DOCTRINE_ADMIN)
        returns (uint32 version)
    {
        require(doctrineHash != bytes32(0), "doctrine hash required");
        version = nextVersion + 1;
        nextVersion = version;
        doctrines[version] = Doctrine({
            doctrineHash: doctrineHash,
            metadataHash: metadataHash,
            timestamp: uint64(block.timestamp),
            version: version,
            exists: true
        });
        emit DoctrinePublished(version, doctrineHash, metadataHash);
    }

    function activateDoctrine(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(doctrines[version].exists, "doctrine missing");
        activeVersion = version;
        emit DoctrineActivated(version);
    }

    function activeDoctrineVersion() external view returns (uint32) {
        return activeVersion;
    }

    function doctrineOf(uint32 version) external view returns (Doctrine memory) {
        return doctrines[version];
    }
}
