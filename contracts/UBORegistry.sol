// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title UBORegistry
/// @notice Stores UBO declaration hashes for entity wallets.
contract UBORegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");

    mapping(address => bytes32) private uboDeclarationHash;
    mapping(address => uint64) private updatedAt;

    event UBODeclared(address indexed wallet, bytes32 indexed declarationHash);
    event UBOUpdated(address indexed wallet, bytes32 indexed declarationHash);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
    }

    function declareUBO(address wallet, bytes32 declarationHash) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        require(declarationHash != bytes32(0), "hash required");
        uboDeclarationHash[wallet] = declarationHash;
        updatedAt[wallet] = uint64(block.timestamp);
        emit UBODeclared(wallet, declarationHash);
    }

    function updateUBO(address wallet, bytes32 declarationHash) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        require(declarationHash != bytes32(0), "hash required");
        uboDeclarationHash[wallet] = declarationHash;
        updatedAt[wallet] = uint64(block.timestamp);
        emit UBOUpdated(wallet, declarationHash);
    }

    function declarationOf(address wallet) external view returns (bytes32) {
        return uboDeclarationHash[wallet];
    }

    function updatedAtOf(address wallet) external view returns (uint64) {
        return updatedAt[wallet];
    }
}
