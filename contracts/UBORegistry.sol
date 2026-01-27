// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title UBORegistry
/// @notice Stores hashes of Ultimate Beneficial Owner (UBO) declarations for corporate wallets without PII.
contract UBORegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");

    mapping(address => bytes32) private uboDeclarationHash;
    mapping(address => uint64) private updatedAt;
    mapping(address => address) private issuer;

    event UBODeclared(address indexed entityWallet, bytes32 uboHash, address indexed issuer, uint64 updatedAt);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
    }

    function declareUBO(address entityWallet, bytes32 uboHash) external onlyRole(COMPLIANCE_ADMIN) {
        require(entityWallet != address(0), "wallet required");
        require(uboHash != bytes32(0), "ubo hash required");
        uboDeclarationHash[entityWallet] = uboHash;
        updatedAt[entityWallet] = uint64(block.timestamp);
        issuer[entityWallet] = msg.sender;
        emit UBODeclared(entityWallet, uboHash, msg.sender, uint64(block.timestamp));
    }

    function uboOf(address entityWallet) external view returns (bytes32) {
        return uboDeclarationHash[entityWallet];
    }

    function updatedAtOf(address entityWallet) external view returns (uint64) {
        return updatedAt[entityWallet];
    }

    function issuerOf(address entityWallet) external view returns (address) {
        return issuer[entityWallet];
    }
}
