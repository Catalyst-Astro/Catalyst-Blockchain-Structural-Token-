// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./EventRegistry.sol";

/// @title EventGate
/// @notice Reusable guard that enforces event verification state before critical actions.
contract EventGate is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");

    EventRegistry public eventRegistry;

    event EventRegistrySet(address indexed registry);

    constructor(address admin, EventRegistry registry) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        eventRegistry = registry;
        emit EventRegistrySet(address(registry));
    }

    function setEventRegistry(EventRegistry registry) external onlyRole(COMPLIANCE_ADMIN) {
        eventRegistry = registry;
        emit EventRegistrySet(address(registry));
    }

    function requireVerified(bytes32 eid) external view {
        require(address(eventRegistry) != address(0), "event registry not set");
        require(eventRegistry.statusOf(eid) == EventRegistry.EventStatus.VERIFIED, "event not verified");
    }

    function requireNotRejected(bytes32 eid) external view {
        require(address(eventRegistry) != address(0), "event registry not set");
        require(eventRegistry.statusOf(eid) != EventRegistry.EventStatus.REJECTED, "event rejected");
    }
}
