// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title UBOAttestationRegistry
/// @notice Stores UBO verification attestations and high-risk flags.
contract UBOAttestationRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant UBO_VERIFIER = keccak256("UBO_VERIFIER");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Attestation {
        bytes32 attestationHash;
        uint64 timestamp;
        bool highRisk;
    }

    mapping(bytes32 => Attestation) private attestations;

    event UBOAttested(bytes32 indexed entityId, bytes32 indexed attestationHash, uint64 timestamp);
    event HighRiskFlagSet(bytes32 indexed entityId);
    event HighRiskFlagCleared(bytes32 indexed entityId);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(UBO_VERIFIER, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(UBO_VERIFIER, COMPLIANCE_ADMIN);
        _setRoleAdmin(LEGAL_AUDITOR, COMPLIANCE_ADMIN);
    }

    function attestUBO(bytes32 entityId, bytes32 attestationHash) external onlyRole(UBO_VERIFIER) {
        require(entityId != bytes32(0), "entity required");
        require(attestationHash != bytes32(0), "hash required");
        attestations[entityId] = Attestation({
            attestationHash: attestationHash,
            timestamp: uint64(block.timestamp),
            highRisk: attestations[entityId].highRisk
        });
        emit UBOAttested(entityId, attestationHash, uint64(block.timestamp));
    }

    function setHighRiskFlag(bytes32 entityId, bool flagged) external onlyRole(COMPLIANCE_ADMIN) {
        require(entityId != bytes32(0), "entity required");
        attestations[entityId].highRisk = flagged;
        if (flagged) {
            emit HighRiskFlagSet(entityId);
        } else {
            emit HighRiskFlagCleared(entityId);
        }
    }

    function getAttestation(bytes32 entityId) external view returns (Attestation memory) {
        return attestations[entityId];
    }

    function isHighRisk(bytes32 entityId) external view returns (bool) {
        return attestations[entityId].highRisk;
    }
}
