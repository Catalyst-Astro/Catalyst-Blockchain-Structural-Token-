// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./IdentityRegistry.sol";
import "./AMLScoringRegistry.sol";

/// @title ComplianceGate
/// @notice Verifies KYC status and AML risk prior to allowing operations.
contract ComplianceGate is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");

    IdentityRegistry public identityRegistry;
    AMLScoringRegistry public scoringRegistry;

    AMLScoringRegistry.RiskLevel public maxAllowedRisk;
    bool public enforcementEnabled;

    event GateConfigured(address indexed identityRegistry, address indexed scoringRegistry);
    event GatePolicyUpdated(bool enforcementEnabled, AMLScoringRegistry.RiskLevel maxAllowedRisk);

    constructor(address admin, IdentityRegistry identityRegistry_, AMLScoringRegistry scoringRegistry_) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);

        identityRegistry = identityRegistry_;
        scoringRegistry = scoringRegistry_;
        maxAllowedRisk = AMLScoringRegistry.RiskLevel.MEDIUM;
        enforcementEnabled = true;
        emit GateConfigured(address(identityRegistry_), address(scoringRegistry_));
        emit GatePolicyUpdated(enforcementEnabled, maxAllowedRisk);
    }

    function setRegistries(IdentityRegistry identityRegistry_, AMLScoringRegistry scoringRegistry_)
        external
        onlyRole(COMPLIANCE_ADMIN)
    {
        require(address(identityRegistry_) != address(0), "identity registry required");
        require(address(scoringRegistry_) != address(0), "scoring registry required");
        identityRegistry = identityRegistry_;
        scoringRegistry = scoringRegistry_;
        emit GateConfigured(address(identityRegistry_), address(scoringRegistry_));
    }

    function setPolicy(bool enforcementEnabled_, AMLScoringRegistry.RiskLevel maxAllowedRisk_)
        external
        onlyRole(DAO_COUNCIL)
    {
        enforcementEnabled = enforcementEnabled_;
        maxAllowedRisk = maxAllowedRisk_;
        emit GatePolicyUpdated(enforcementEnabled_, maxAllowedRisk_);
    }

    function validate(address wallet) external view {
        if (!enforcementEnabled) {
            return;
        }
        require(wallet != address(0), "wallet required");
        require(identityRegistry.isVerified(wallet), "KYC not verified");
        AMLScoringRegistry.RiskLevel level = scoringRegistry.riskOf(wallet);
        require(uint8(level) <= uint8(maxAllowedRisk), "AML risk too high");
    }
}
