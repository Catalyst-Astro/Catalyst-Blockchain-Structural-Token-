// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title OperationsRegistry
/// @notice Tracks operational status, audit checkpoints, and active jurisdictions.
contract OperationsRegistry is AccessControl {
    bytes32 public constant OPERATIONS_ADMIN = keccak256("OPERATIONS_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant AUDIT_ADMIN = keccak256("AUDIT_ADMIN");

    enum OperationalStatus {
        NORMAL,
        DEGRADED,
        EMERGENCY
    }

    OperationalStatus public operationalStatus;
    uint64 public lastAuditTimestamp;

    bytes32[] private jurisdictions;
    mapping(bytes32 => bool) private jurisdictionActive;
    mapping(bytes32 => uint256) private jurisdictionIndex;

    event OperationsStatusChanged(OperationalStatus status, bytes32 reasonHash, uint64 timestamp);
    event AuditCheckpointRecorded(
        bytes32 indexed checkpointId,
        bytes32 scope,
        bytes32 evidenceHash,
        uint64 periodStart,
        uint64 periodEnd,
        uint64 timestamp
    );
    event JurisdictionStatusChanged(bytes32 indexed jurisdiction, bool active);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATIONS_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(AUDIT_ADMIN, admin);
        _setRoleAdmin(OPERATIONS_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, OPERATIONS_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(AUDIT_ADMIN, OPERATIONS_ADMIN);
        operationalStatus = OperationalStatus.NORMAL;
    }

    function setOperationalStatus(OperationalStatus status, bytes32 reasonHash) external {
        require(
            hasRole(OPERATIONS_ADMIN, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender),
            "not authorized"
        );
        operationalStatus = status;
        emit OperationsStatusChanged(status, reasonHash, uint64(block.timestamp));
    }

    function recordAuditCheckpoint(
        bytes32 checkpointId,
        bytes32 scope,
        bytes32 evidenceHash,
        uint64 periodStart,
        uint64 periodEnd
    ) external onlyRole(AUDIT_ADMIN) {
        require(checkpointId != bytes32(0), "checkpoint id required");
        require(scope != bytes32(0), "scope required");
        require(evidenceHash != bytes32(0), "evidence hash required");
        lastAuditTimestamp = uint64(block.timestamp);
        emit AuditCheckpointRecorded(
            checkpointId,
            scope,
            evidenceHash,
            periodStart,
            periodEnd,
            uint64(block.timestamp)
        );
    }

    function setJurisdiction(bytes32 jurisdiction, bool active) external onlyRole(COMPLIANCE_ADMIN) {
        require(jurisdiction != bytes32(0), "jurisdiction required");
        if (active && !jurisdictionActive[jurisdiction]) {
            jurisdictions.push(jurisdiction);
            jurisdictionActive[jurisdiction] = true;
            jurisdictionIndex[jurisdiction] = jurisdictions.length;
        } else if (!active && jurisdictionActive[jurisdiction]) {
            _removeJurisdiction(jurisdiction);
        }
        emit JurisdictionStatusChanged(jurisdiction, active);
    }

    function isJurisdictionActive(bytes32 jurisdiction) external view returns (bool) {
        return jurisdictionActive[jurisdiction];
    }

    function activeJurisdictions() external view returns (bytes32[] memory) {
        return jurisdictions;
    }

    function _removeJurisdiction(bytes32 jurisdiction) internal {
        uint256 index = jurisdictionIndex[jurisdiction];
        if (index == 0) {
            return;
        }
        uint256 arrayIndex = index - 1;
        uint256 lastIndex = jurisdictions.length - 1;
        if (arrayIndex != lastIndex) {
            bytes32 lastValue = jurisdictions[lastIndex];
            jurisdictions[arrayIndex] = lastValue;
            jurisdictionIndex[lastValue] = index;
        }
        jurisdictions.pop();
        jurisdictionActive[jurisdiction] = false;
        jurisdictionIndex[jurisdiction] = 0;
    }
}
