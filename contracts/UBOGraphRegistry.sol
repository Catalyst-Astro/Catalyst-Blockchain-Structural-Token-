// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title UBOGraphRegistry
/// @notice Stores versioned UBO graph report hashes without PII.
contract UBOGraphRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant UBO_VERIFIER = keccak256("UBO_VERIFIER");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct UBOGraph {
        bytes32 uboGraphHash;
        uint64 validFrom;
        uint64 validTo;
        address verifier;
        bool active;
    }

    mapping(bytes32 => uint256) public latestVersion;
    mapping(bytes32 => uint256) public activeVersion;
    mapping(bytes32 => mapping(uint256 => UBOGraph)) private graphs;

    event UBOGraphSubmitted(bytes32 indexed entityId, uint256 indexed version, bytes32 indexed uboGraphHash);
    event UBOGraphActivated(bytes32 indexed entityId, uint256 indexed version);
    event UBOGraphExpired(bytes32 indexed entityId, uint256 indexed version);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(UBO_VERIFIER, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(UBO_VERIFIER, COMPLIANCE_ADMIN);
        _setRoleAdmin(LEGAL_AUDITOR, COMPLIANCE_ADMIN);
    }

    function submitGraph(
        bytes32 entityId,
        bytes32 uboGraphHash,
        uint64 validFrom,
        uint64 validTo
    ) external onlyRole(UBO_VERIFIER) returns (uint256) {
        require(entityId != bytes32(0), "entity required");
        require(uboGraphHash != bytes32(0), "hash required");
        require(validTo == 0 || validTo > validFrom, "invalid validity");

        uint256 nextVersion = latestVersion[entityId] + 1;
        latestVersion[entityId] = nextVersion;
        graphs[entityId][nextVersion] = UBOGraph({
            uboGraphHash: uboGraphHash,
            validFrom: validFrom,
            validTo: validTo,
            verifier: msg.sender,
            active: false
        });

        emit UBOGraphSubmitted(entityId, nextVersion, uboGraphHash);
        return nextVersion;
    }

    function activateGraph(bytes32 entityId, uint256 version) external onlyRole(UBO_VERIFIER) {
        require(version > 0, "version required");
        UBOGraph storage graph = graphs[entityId][version];
        require(graph.uboGraphHash != bytes32(0), "graph missing");

        if (activeVersion[entityId] != 0) {
            graphs[entityId][activeVersion[entityId]].active = false;
        }
        graph.active = true;
        activeVersion[entityId] = version;
        emit UBOGraphActivated(entityId, version);
    }

    function expireGraph(bytes32 entityId, uint256 version) external onlyRole(UBO_VERIFIER) {
        require(version > 0, "version required");
        UBOGraph storage graph = graphs[entityId][version];
        require(graph.uboGraphHash != bytes32(0), "graph missing");
        graph.active = false;
        graph.validTo = uint64(block.timestamp);
        if (activeVersion[entityId] == version) {
            activeVersion[entityId] = 0;
        }
        emit UBOGraphExpired(entityId, version);
    }

    function getGraph(bytes32 entityId, uint256 version) external view returns (UBOGraph memory) {
        return graphs[entityId][version];
    }

    function getActiveGraph(bytes32 entityId) external view returns (UBOGraph memory) {
        return graphs[entityId][activeVersion[entityId]];
    }

    function isGraphActive(bytes32 entityId) external view returns (bool) {
        uint256 version = activeVersion[entityId];
        if (version == 0) {
            return false;
        }
        UBOGraph memory graph = graphs[entityId][version];
        if (!graph.active) {
            return false;
        }
        if (graph.validFrom > block.timestamp) {
            return false;
        }
        if (graph.validTo != 0 && block.timestamp > graph.validTo) {
            return false;
        }
        return true;
    }
}
