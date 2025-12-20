// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AMLScoringRegistry
/// @notice Stores AML risk levels without PII.
contract AMLScoringRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant ORACLE_OPERATOR = keccak256("ORACLE_OPERATOR");

    enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH
    }

    mapping(address => RiskLevel) private riskLevels;
    mapping(address => uint64) private updatedAt;

    event RiskScoreAssigned(address indexed wallet, RiskLevel level);
    event RiskScoreUpdated(address indexed wallet, RiskLevel level);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(ORACLE_OPERATOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ORACLE_OPERATOR, COMPLIANCE_ADMIN);
    }

    function assignRisk(address wallet, RiskLevel level) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        riskLevels[wallet] = level;
        updatedAt[wallet] = uint64(block.timestamp);
        emit RiskScoreAssigned(wallet, level);
    }

    function updateRisk(address wallet, RiskLevel level) external onlyRole(ORACLE_OPERATOR) {
        require(wallet != address(0), "wallet required");
        riskLevels[wallet] = level;
        updatedAt[wallet] = uint64(block.timestamp);
        emit RiskScoreUpdated(wallet, level);
    }

    function riskOf(address wallet) external view returns (RiskLevel) {
        return riskLevels[wallet];
    }

    function updatedAtOf(address wallet) external view returns (uint64) {
        return updatedAt[wallet];
    }
}
