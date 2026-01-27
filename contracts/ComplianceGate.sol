// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AMLScoringRegistry.sol";
import "./CredentialRegistry.sol";
import "./IdentityRegistry.sol";
import "./RoleAuthority.sol";

/// @title ComplianceGate
/// @notice Verifies identity, AML risk, and optional role credentials prior to allowing operations.
contract ComplianceGate {
    RoleAuthority public roleAuthority;
    IdentityRegistry public identityRegistry;
    CredentialRegistry public credentialRegistry;
    AMLScoringRegistry public scoringRegistry;

    AMLScoringRegistry.RiskLevel public maxAllowedRisk;
    bool public enforcementEnabled;
    bytes32 public requiredCredentialRole;

    event RoleAuthorityUpdated(address indexed roleAuthority);
    event GateConfigured(
        address indexed identityRegistry,
        address indexed scoringRegistry,
        address indexed credentialRegistry
    );
    event GatePolicyUpdated(
        bool enforcementEnabled,
        AMLScoringRegistry.RiskLevel maxAllowedRisk,
        bytes32 requiredCredentialRole
    );

    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 private constant COMPLIANCE_ADMIN_ROLE = keccak256("COMPLIANCE_ADMIN");
    bytes32 private constant DAO_COUNCIL_ROLE = keccak256("DAO_COUNCIL");

    modifier onlyComplianceAdmin() {
        require(roleAuthority.hasRole(COMPLIANCE_ADMIN_ROLE, msg.sender), "not compliance admin");
        _;
    }

    modifier onlyCouncil() {
        require(roleAuthority.hasRole(DAO_COUNCIL_ROLE, msg.sender), "not dao council");
        _;
    }

    modifier onlyAuthorityAdmin() {
        require(roleAuthority.hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not authority admin");
        _;
    }

    constructor(
        RoleAuthority roleAuthority_,
        IdentityRegistry identityRegistry_,
        AMLScoringRegistry scoringRegistry_,
        CredentialRegistry credentialRegistry_,
        bytes32 requiredCredentialRole_
    ) {
        require(address(roleAuthority_) != address(0), "role authority required");
        require(address(identityRegistry_) != address(0), "identity registry required");
        require(address(scoringRegistry_) != address(0), "scoring registry required");
        roleAuthority = roleAuthority_;
        identityRegistry = identityRegistry_;
        scoringRegistry = scoringRegistry_;
        credentialRegistry = credentialRegistry_;
        requiredCredentialRole = requiredCredentialRole_;
        maxAllowedRisk = AMLScoringRegistry.RiskLevel.MEDIUM;
        enforcementEnabled = true;

        emit RoleAuthorityUpdated(address(roleAuthority_));
        emit GateConfigured(address(identityRegistry_), address(scoringRegistry_), address(credentialRegistry_));
        emit GatePolicyUpdated(enforcementEnabled, maxAllowedRisk, requiredCredentialRole_);
    }

    function setRoleAuthority(RoleAuthority roleAuthority_) external onlyAuthorityAdmin {
        require(address(roleAuthority_) != address(0), "role authority required");
        roleAuthority = roleAuthority_;
        emit RoleAuthorityUpdated(address(roleAuthority_));
    }

    function setRegistries(
        IdentityRegistry identityRegistry_,
        AMLScoringRegistry scoringRegistry_,
        CredentialRegistry credentialRegistry_
    ) external onlyComplianceAdmin {
        require(address(identityRegistry_) != address(0), "identity registry required");
        require(address(scoringRegistry_) != address(0), "scoring registry required");
        identityRegistry = identityRegistry_;
        scoringRegistry = scoringRegistry_;
        credentialRegistry = credentialRegistry_;
        emit GateConfigured(address(identityRegistry_), address(scoringRegistry_), address(credentialRegistry_));
    }

    function setPolicy(
        bool enforcementEnabled_,
        AMLScoringRegistry.RiskLevel maxAllowedRisk_,
        bytes32 requiredCredentialRole_
    ) external onlyCouncil {
        enforcementEnabled = enforcementEnabled_;
        maxAllowedRisk = maxAllowedRisk_;
        requiredCredentialRole = requiredCredentialRole_;
        emit GatePolicyUpdated(enforcementEnabled_, maxAllowedRisk_, requiredCredentialRole_);
    }

    function validate(address wallet) external view {
        if (!enforcementEnabled) {
            return;
        }
        require(wallet != address(0), "wallet required");
        require(identityRegistry.isVerified(wallet), "KYC not verified");

        AMLScoringRegistry.RiskLevel level = scoringRegistry.riskOf(wallet);
        require(uint8(level) <= uint8(maxAllowedRisk), "AML risk too high");

        if (requiredCredentialRole != bytes32(0)) {
            require(address(credentialRegistry) != address(0), "credential registry not set");
            require(
                credentialRegistry.isCredentialActive(wallet, requiredCredentialRole),
                "credential not active"
            );
        }
    }
}
