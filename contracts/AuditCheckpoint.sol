// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IOperationsRegistry.sol";

/// @title AuditCheckpoint
/// @notice Records periodic audit checkpoints with evidence hashes.
contract AuditCheckpoint is AccessControl {
    bytes32 public constant AUDIT_ADMIN = keccak256("AUDIT_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Checkpoint {
        bytes32 checkpointId;
        bytes32 scope;
        bytes32 evidenceHash;
        uint64 periodStart;
        uint64 periodEnd;
        uint64 recordedAt;
        address recordedBy;
    }

    mapping(bytes32 => Checkpoint) private checkpoints;

    IOperationsRegistry public operationsRegistry;

    event AuditCheckpointCreated(
        bytes32 indexed checkpointId,
        bytes32 scope,
        bytes32 evidenceHash,
        uint64 periodStart,
        uint64 periodEnd,
        uint64 recordedAt
    );
    event OperationsRegistrySet(address indexed registry);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(AUDIT_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(AUDIT_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function setOperationsRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        operationsRegistry = IOperationsRegistry(registry);
        emit OperationsRegistrySet(registry);
    }

    function recordCheckpoint(bytes32 scope, bytes32 evidenceHash, uint64 periodStart, uint64 periodEnd)
        external
        onlyRole(AUDIT_ADMIN)
        returns (bytes32 checkpointId)
    {
        require(scope != bytes32(0), "scope required");
        require(evidenceHash != bytes32(0), "evidence hash required");
        checkpointId = keccak256(
            abi.encodePacked(scope, evidenceHash, periodStart, periodEnd, block.timestamp, msg.sender)
        );
        checkpoints[checkpointId] = Checkpoint({
            checkpointId: checkpointId,
            scope: scope,
            evidenceHash: evidenceHash,
            periodStart: periodStart,
            periodEnd: periodEnd,
            recordedAt: uint64(block.timestamp),
            recordedBy: msg.sender
        });
        emit AuditCheckpointCreated(
            checkpointId,
            scope,
            evidenceHash,
            periodStart,
            periodEnd,
            uint64(block.timestamp)
        );

        if (address(operationsRegistry) != address(0)) {
            operationsRegistry.recordAuditCheckpoint(checkpointId, scope, evidenceHash, periodStart, periodEnd);
        }
    }

    function checkpointOf(bytes32 checkpointId) external view returns (Checkpoint memory) {
        return checkpoints[checkpointId];
    }
}
