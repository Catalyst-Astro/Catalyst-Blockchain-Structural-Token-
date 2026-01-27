// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RoleAuthority
/// @notice Centralized role authority used by registries and gates.
contract RoleAuthority is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant NOTARY = keccak256("NOTARY");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");
    bytes32 public constant ORACLE_OPERATOR = keccak256("ORACLE_OPERATOR");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);

        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(NOTARY, COMPLIANCE_ADMIN);
        _setRoleAdmin(AUDITOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(ORACLE_OPERATOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);
    }
}
