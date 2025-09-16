// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AccessControlLand
 * @notice Gestiona los roles de administradores y validadores para el registro
 *         de activos.
 */
contract AccessControlLand is AccessControl {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @notice Añade una cuenta como validador autorizado.
     */
    function addValidator(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(VALIDATOR_ROLE, account);
    }

    /**
     * @notice Revoca el rol de validador a una cuenta.
     */
    function removeValidator(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(VALIDATOR_ROLE, account);
    }
}
