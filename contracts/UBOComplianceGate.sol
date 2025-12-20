// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./EntityRegistry.sol";
import "./UBOGraphRegistry.sol";
import "./UBOAttestationRegistry.sol";
import "./interfaces/IComplianceGate.sol";

/// @title UBOComplianceGate
/// @notice Validates corporate UBO requirements and optional AML compliance gate.
contract UBOComplianceGate is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant UBO_VERIFIER = keccak256("UBO_VERIFIER");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");

    EntityRegistry public entityRegistry;
    UBOGraphRegistry public graphRegistry;
    UBOAttestationRegistry public attestationRegistry;
    IComplianceGate public complianceGate;

    bool public enforcementEnabled;
    bool public blockHighRisk;
    bool public requireComplianceGate;

    event GateConfigured(address indexed entityRegistry, address indexed graphRegistry, address indexed attestationRegistry);
    event GatePolicyUpdated(bool enforcementEnabled, bool blockHighRisk, bool requireComplianceGate);
    event ComplianceGateSet(address indexed complianceGate, bool required);

    constructor(
        address admin,
        EntityRegistry entityRegistry_,
        UBOGraphRegistry graphRegistry_,
        UBOAttestationRegistry attestationRegistry_
    ) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(UBO_VERIFIER, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(DAO_COUNCIL, admin);
        _setRoleAdmin(UBO_VERIFIER, COMPLIANCE_ADMIN);
        _setRoleAdmin(LEGAL_AUDITOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);

        entityRegistry = entityRegistry_;
        graphRegistry = graphRegistry_;
        attestationRegistry = attestationRegistry_;
        enforcementEnabled = true;
        blockHighRisk = true;
        requireComplianceGate = false;
        emit GateConfigured(address(entityRegistry_), address(graphRegistry_), address(attestationRegistry_));
        emit GatePolicyUpdated(enforcementEnabled, blockHighRisk, requireComplianceGate);
    }

    function setRegistries(
        EntityRegistry entityRegistry_,
        UBOGraphRegistry graphRegistry_,
        UBOAttestationRegistry attestationRegistry_
    ) external onlyRole(COMPLIANCE_ADMIN) {
        require(address(entityRegistry_) != address(0), "entity registry required");
        require(address(graphRegistry_) != address(0), "graph registry required");
        require(address(attestationRegistry_) != address(0), "attestation registry required");
        entityRegistry = entityRegistry_;
        graphRegistry = graphRegistry_;
        attestationRegistry = attestationRegistry_;
        emit GateConfigured(address(entityRegistry_), address(graphRegistry_), address(attestationRegistry_));
    }

    function setPolicy(bool enforcementEnabled_, bool blockHighRisk_, bool requireComplianceGate_)
        external
        onlyRole(DAO_COUNCIL)
    {
        enforcementEnabled = enforcementEnabled_;
        blockHighRisk = blockHighRisk_;
        requireComplianceGate = requireComplianceGate_;
        emit GatePolicyUpdated(enforcementEnabled_, blockHighRisk_, requireComplianceGate_);
    }

    function setComplianceGate(address gate, bool required) external onlyRole(COMPLIANCE_ADMIN) {
        complianceGate = IComplianceGate(gate);
        requireComplianceGate = required;
        emit ComplianceGateSet(gate, required);
    }

    function isUBOValid(bytes32 entityId) public view returns (bool) {
        if (!enforcementEnabled) {
            return true;
        }
        if (entityId == bytes32(0)) {
            return true;
        }
        if (!entityRegistry.isActive(entityId)) {
            return false;
        }
        if (!graphRegistry.isGraphActive(entityId)) {
            return false;
        }
        if (attestationRegistry.getAttestation(entityId).attestationHash == bytes32(0)) {
            return false;
        }
        if (blockHighRisk && attestationRegistry.isHighRisk(entityId)) {
            return false;
        }
        return true;
    }

    function validateWallet(address wallet) external view {
        bytes32 entityId = entityRegistry.entityOf(wallet);
        if (entityId == bytes32(0)) {
            return;
        }
        require(isUBOValid(entityId), "UBO not valid");
        if (requireComplianceGate) {
            require(address(complianceGate) != address(0), "compliance gate not set");
            complianceGate.validate(wallet);
        }
    }
}
