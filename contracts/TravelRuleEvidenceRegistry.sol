// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title TravelRuleEvidenceRegistry
/// @notice Stores Travel Rule evidence hashes and statuses (no PII).
contract TravelRuleEvidenceRegistry is AccessControl {
    bytes32 public constant TRAVEL_ADMIN = keccak256("TRAVEL_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    enum Status {
        CREATED,
        SENT,
        RECEIVED,
        VERIFIED,
        REJECTED
    }

    struct Evidence {
        bytes32 referenceId;
        bytes32 txHash;
        bytes32 packageHash;
        uint64 timestamp;
        Status status;
        bool exists;
    }

    mapping(bytes32 => Evidence) private evidence;

    event TravelEvidenceRecorded(
        bytes32 indexed evidenceId,
        bytes32 indexed referenceId,
        bytes32 txHash,
        bytes32 packageHash,
        uint64 timestamp,
        Status status
    );
    event TravelEvidenceStatusUpdated(bytes32 indexed evidenceId, Status status, uint64 timestamp);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TRAVEL_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(TRAVEL_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, TRAVEL_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function recordEvidence(
        bytes32 evidenceId,
        bytes32 referenceId,
        bytes32 txHash,
        bytes32 packageHash,
        Status status
    ) external onlyRole(TRAVEL_ADMIN) {
        require(evidenceId != bytes32(0), "evidence id required");
        require(packageHash != bytes32(0), "package hash required");
        require(!evidence[evidenceId].exists, "evidence exists");

        evidence[evidenceId] = Evidence({
            referenceId: referenceId,
            txHash: txHash,
            packageHash: packageHash,
            timestamp: uint64(block.timestamp),
            status: status,
            exists: true
        });

        emit TravelEvidenceRecorded(
            evidenceId,
            referenceId,
            txHash,
            packageHash,
            uint64(block.timestamp),
            status
        );
    }

    function updateStatus(bytes32 evidenceId, Status status) external onlyRole(COMPLIANCE_ADMIN) {
        Evidence storage item = evidence[evidenceId];
        require(item.exists, "evidence missing");
        item.status = status;
        emit TravelEvidenceStatusUpdated(evidenceId, status, uint64(block.timestamp));
    }

    function evidenceOf(bytes32 evidenceId) external view returns (Evidence memory) {
        return evidence[evidenceId];
    }

    function evidenceStatus(bytes32 evidenceId) external view returns (Status status, bool exists) {
        Evidence storage item = evidence[evidenceId];
        return (item.status, item.exists);
    }
}
