// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IWalletJurisdictionRegistry.sol";

/// @title JurisdictionRegistry
/// @notice Stores jurisdiction codes for wallets without PII.
contract JurisdictionRegistry is AccessControl, IWalletJurisdictionRegistry {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant ORACLE_OPERATOR = keccak256("ORACLE_OPERATOR");

    mapping(address => bytes32) private jurisdictions;

    event JurisdictionSet(address indexed wallet, bytes32 jurisdictionCode);
    event JurisdictionUpdated(address indexed wallet, bytes32 jurisdictionCode);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(ORACLE_OPERATOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);
        _setRoleAdmin(LEGAL_AUDITOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(ORACLE_OPERATOR, COMPLIANCE_ADMIN);
    }

    function setJurisdiction(address wallet, bytes32 jurisdictionCode) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        require(jurisdictionCode != bytes32(0), "jurisdiction required");
        jurisdictions[wallet] = jurisdictionCode;
        emit JurisdictionSet(wallet, jurisdictionCode);
    }

    function updateJurisdiction(address wallet, bytes32 jurisdictionCode) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        require(jurisdictionCode != bytes32(0), "jurisdiction required");
        jurisdictions[wallet] = jurisdictionCode;
        emit JurisdictionUpdated(wallet, jurisdictionCode);
    }

    function jurisdictionOf(address wallet) external view returns (bytes32) {
        return jurisdictions[wallet];
    }
}
