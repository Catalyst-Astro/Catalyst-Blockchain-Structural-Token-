// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./EvidenceAnchor.sol";

/// @title PolicyRegistry
/// @notice Versioned registry of policy hashes with activation and anchoring.
contract PolicyRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");

    struct Policy {
        bytes32 pid;
        bytes32 policyHash;
        uint64 activeFrom;
        address issuer;
        bool active;
    }

    mapping(bytes32 => Policy) private policies;
    bytes32 public activePolicyPid;
    EvidenceAnchor public evidenceAnchor;

    event PolicyRegistered(bytes32 indexed pid, bytes32 policyHash, uint64 activeFrom, address issuer);
    event PolicyActivated(bytes32 indexed pid, uint64 activatedAt);
    event EvidenceAnchorSet(address indexed anchor);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);
    }

    function setEvidenceAnchor(address anchor) external onlyRole(COMPLIANCE_ADMIN) {
        evidenceAnchor = EvidenceAnchor(anchor);
        // Allow this registry to anchor policies directly (best effort)
        try evidenceAnchor.grantRole(evidenceAnchor.AUDITOR(), address(this)) {} catch {}
        emit EvidenceAnchorSet(anchor);
    }

    function registerPolicy(bytes32 pid, bytes32 policyHash, uint64 activeFrom) external {
        require(hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender), "not authorized");
        require(pid != bytes32(0), "pid required");
        require(policyHash != bytes32(0), "hash required");
        require(policies[pid].issuer == address(0), "pid exists");
        policies[pid] = Policy({
            pid: pid,
            policyHash: policyHash,
            activeFrom: activeFrom,
            issuer: msg.sender,
            active: false
        });
        emit PolicyRegistered(pid, policyHash, activeFrom, msg.sender);
        if (address(evidenceAnchor) != address(0)) {
            try evidenceAnchor.anchorHash(policyHash, EvidenceAnchor.AnchorType.POLICY, pid) {} catch {}
        }
    }

    function activatePolicy(bytes32 pid) external onlyRole(DAO_COUNCIL) {
        Policy storage p = policies[pid];
        require(p.issuer != address(0), "policy missing");
        activePolicyPid = pid;
        p.active = true;
        emit PolicyActivated(pid, uint64(block.timestamp));
    }

    function getPolicy(bytes32 pid) external view returns (Policy memory) {
        return policies[pid];
    }

    function getActivePolicy() external view returns (Policy memory) {
        return policies[activePolicyPid];
    }
}
