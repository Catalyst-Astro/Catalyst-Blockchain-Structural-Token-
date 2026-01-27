// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title BatchRootRegistry
/// @notice Stores Merkle batch roots for off-chain evidence batching.
contract BatchRootRegistry is AccessControl {
    struct BatchRoot {
        bytes32 root;
        bytes32 batchId;
        uint64 anchoredAt;
        address actor;
    }

    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");

    mapping(bytes32 => BatchRoot) private batches;

    event BatchRootSubmitted(bytes32 indexed batchId, bytes32 indexed root, address actor, uint64 anchoredAt);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(AUDITOR, COMPLIANCE_ADMIN);
    }

    modifier onlySubmitter() {
        require(hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(AUDITOR, msg.sender), "not authorized");
        _;
    }

    function submitRoot(bytes32 batchId, bytes32 root) external onlySubmitter {
        require(batchId != bytes32(0), "batchId required");
        require(root != bytes32(0), "root required");
        require(batches[batchId].anchoredAt == 0, "batch exists");
        batches[batchId] = BatchRoot({root: root, batchId: batchId, anchoredAt: uint64(block.timestamp), actor: msg.sender});
        emit BatchRootSubmitted(batchId, root, msg.sender, uint64(block.timestamp));
    }

    function getBatch(bytes32 batchId) external view returns (BatchRoot memory) {
        return batches[batchId];
    }
}
