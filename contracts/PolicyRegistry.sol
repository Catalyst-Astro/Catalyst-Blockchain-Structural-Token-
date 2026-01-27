// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EvidenceAnchor} from "./EvidenceAnchor.sol";

/// @title PolicyRegistry
/// @author Catalyst Team
/// @notice Versioned registry of policy hashes with activation and anchoring.
contract PolicyRegistry is AccessControl {
    /// @notice Role identifier for compliance administrators
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    /// @notice Role identifier for DAO council members
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");

    // Custom errors
    error AdminRequired();
    error NotAuthorized();
    error PidRequired();
    error HashRequired();
    error PidExists();
    error PolicyMissing();

    struct Policy {
        bytes32 pid;
        bytes32 policyHash;
        uint64 activeFrom;
        address issuer;
        bool active;
    }

    mapping(bytes32 => Policy) private policies;
    /// @notice Current active policy identifier
    bytes32 public activePolicyPid;
    /// @notice Reference to the evidence anchor contract
    EvidenceAnchor public evidenceAnchor;

    /// @notice Emitted when a new policy is registered
    /// @param pid Policy identifier
    /// @param policyHash Hash of the policy content
    /// @param activeFrom Timestamp when policy becomes active
    /// @param issuer Address of the policy issuer
    event PolicyRegistered(bytes32 indexed pid, bytes32 policyHash, uint64 indexed activeFrom, address indexed issuer);
    /// @notice Emitted when a policy is activated
    /// @param pid Policy identifier
    /// @param activatedAt Timestamp of activation
    event PolicyActivated(bytes32 indexed pid, uint64 indexed activatedAt);
    /// @notice Emitted when evidence anchor is configured
    /// @param anchor Address of the evidence anchor contract
    event EvidenceAnchorSet(address indexed anchor);

    /// @notice Initializes the contract with admin roles
    /// @param admin Address to grant admin privileges
    constructor(address admin) {
        if (admin == address(0)) revert AdminRequired();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);
    }

    /// @notice Sets the evidence anchor contract reference
    /// @param anchor Address of the evidence anchor contract
    function setEvidenceAnchor(address anchor) external onlyRole(COMPLIANCE_ADMIN) {
        evidenceAnchor = EvidenceAnchor(anchor);
        // Allow this registry to anchor policies directly (best effort)
        try evidenceAnchor.grantRole(evidenceAnchor.AUDITOR(), address(this)) {
            // Role granted successfully
        } catch {
            // Continue if role grant fails
        }
        emit EvidenceAnchorSet(anchor);
    }

    /// @notice Registers a new policy version
    /// @param pid Policy identifier
    /// @param policyHash Hash of the policy content
    /// @param activeFrom Timestamp when policy becomes active
    function registerPolicy(bytes32 pid, bytes32 policyHash, uint64 activeFrom) external {
        if (!hasRole(COMPLIANCE_ADMIN, msg.sender) && !hasRole(DAO_COUNCIL, msg.sender)) revert NotAuthorized();
        if (pid == bytes32(0)) revert PidRequired();
        if (policyHash == bytes32(0)) revert HashRequired();
        if (policies[pid].issuer != address(0)) revert PidExists();
        policies[pid] = Policy({
            pid: pid,
            policyHash: policyHash,
            activeFrom: activeFrom,
            issuer: msg.sender,
            active: false
        });
        emit PolicyRegistered(pid, policyHash, activeFrom, msg.sender);
        if (address(evidenceAnchor) != address(0)) {
            try evidenceAnchor.anchorHash(policyHash, EvidenceAnchor.AnchorType.POLICY, pid) {
                // Hash anchored successfully
            } catch {
                // Continue if anchoring fails
            }
        }
    }

    /// @notice Activates a policy for use
    /// @param pid Policy identifier to activate
    function activatePolicy(bytes32 pid) external onlyRole(DAO_COUNCIL) {
        Policy storage p = policies[pid];
        if (p.issuer == address(0)) revert PolicyMissing();
        activePolicyPid = pid;
        p.active = true;
        emit PolicyActivated(pid, uint64(block.timestamp));
    }

    /// @notice Retrieves a policy by identifier
    /// @param pid Policy identifier
    /// @return Policy struct containing policy data
    function getPolicy(bytes32 pid) external view returns (Policy memory) {
        return policies[pid];
    }

    /// @notice Retrieves the currently active policy
    /// @return Policy struct of the active policy
    function getActivePolicy() external view returns (Policy memory) {
        return policies[activePolicyPid];
    }
}
