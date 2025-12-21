// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title EmergencyMode
/// @notice Time-bound emergency mode with optional DAO ratification.
contract EmergencyMode is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    uint64 public maxDurationSeconds;
    uint64 public activatedAt;
    uint64 public expiresAt;
    address public activatedBy;
    bool public active;
    bool public ratified;
    bytes32 public reasonHash;

    event EmergencyActivated(uint64 activatedAt, uint64 expiresAt, address indexed activatedBy, bytes32 reasonHash);
    event EmergencyRatified(address indexed ratifier, uint64 timestamp);
    event EmergencyDeactivated(address indexed deactivatedBy, uint64 timestamp);

    constructor(address admin, uint64 maxDurationSeconds_) {
        require(admin != address(0), "admin required");
        require(maxDurationSeconds_ > 0, "duration required");
        maxDurationSeconds = maxDurationSeconds_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function activateEmergency(uint64 durationSeconds, bytes32 reasonHash_) external {
        require(hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender), "not authorized");
        require(durationSeconds > 0 && durationSeconds <= maxDurationSeconds, "invalid duration");
        active = true;
        ratified = hasRole(DAO_COUNCIL, msg.sender);
        activatedAt = uint64(block.timestamp);
        expiresAt = uint64(block.timestamp + durationSeconds);
        activatedBy = msg.sender;
        reasonHash = reasonHash_;
        emit EmergencyActivated(activatedAt, expiresAt, msg.sender, reasonHash_);
    }

    function ratifyEmergency() external onlyRole(DAO_COUNCIL) {
        require(active, "not active");
        ratified = true;
        emit EmergencyRatified(msg.sender, uint64(block.timestamp));
    }

    function deactivateEmergency() external {
        require(hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender), "not authorized");
        active = false;
        emit EmergencyDeactivated(msg.sender, uint64(block.timestamp));
    }

    function isEmergencyActive() public view returns (bool) {
        if (!active) {
            return false;
        }
        if (expiresAt != 0 && block.timestamp > expiresAt) {
            return false;
        }
        return true;
    }
}
