// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IWhitelistPolicy.sol";
import "./interfaces/IComplianceGate.sol";
import "./interfaces/IRiskScoreRegistry.sol";
import "./interfaces/ITravelRuleGate.sol";
import "./interfaces/IInvestorEligibilityRegistry.sol";
import "./interfaces/IPrivateOfferingRegistry.sol";
import "./interfaces/IDisclosureRegistry.sol";
import "./interfaces/IAcceptanceRegistry.sol";

/// @title WhitelistPolicy
/// @notice Versioned whitelist policies for disclosures, AML, risk, and Travel Rule.
contract WhitelistPolicy is AccessControl, IWhitelistPolicy {
    bytes32 public constant WHITELIST_ADMIN = keccak256("WHITELIST_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Policy {
        bool disclosuresRequired;
        bool complianceRequired;
        bool riskScoreRequired;
        uint8 maxRiskLevel;
        bool eligibilityRequired;
        bool travelRuleRequired;
        bytes32 offeringId;
        bytes32 policyHash;
        uint32 version;
        bool exists;
    }

    mapping(uint32 => Policy) private policies;
    uint32 private activeVersion;
    uint32 private nextVersion;

    IDisclosureRegistry public disclosureRegistry;
    IAcceptanceRegistry public acceptanceRegistry;
    IComplianceGate public complianceGate;
    IRiskScoreRegistry public riskScoreRegistry;
    ITravelRuleGate public travelRuleGate;
    IInvestorEligibilityRegistry public eligibilityRegistry;
    IPrivateOfferingRegistry public offeringRegistry;

    event WhitelistPolicyPublished(uint32 version, bytes32 policyHash);
    event WhitelistPolicyActivated(uint32 version);
    event DisclosureRegistrySet(address indexed registry);
    event AcceptanceRegistrySet(address indexed registry);
    event ComplianceGateSet(address indexed gate);
    event RiskScoreRegistrySet(address indexed registry);
    event TravelRuleGateSet(address indexed gate);
    event EligibilityRegistrySet(address indexed registry);
    event OfferingRegistrySet(address indexed registry);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(WHITELIST_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(WHITELIST_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, WHITELIST_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishPolicy(
        bool disclosuresRequired,
        bool complianceRequired,
        bool riskScoreRequired,
        uint8 maxRiskLevel,
        bool eligibilityRequired,
        bool travelRuleRequired,
        bytes32 offeringId,
        bytes32 policyHash
    ) external onlyRole(WHITELIST_ADMIN) returns (uint32 version) {
        version = nextVersion + 1;
        nextVersion = version;
        policies[version] = Policy({
            disclosuresRequired: disclosuresRequired,
            complianceRequired: complianceRequired,
            riskScoreRequired: riskScoreRequired,
            maxRiskLevel: maxRiskLevel,
            eligibilityRequired: eligibilityRequired,
            travelRuleRequired: travelRuleRequired,
            offeringId: offeringId,
            policyHash: policyHash,
            version: version,
            exists: true
        });
        emit WhitelistPolicyPublished(version, policyHash);
    }

    function activatePolicy(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(policies[version].exists, "policy missing");
        activeVersion = version;
        emit WhitelistPolicyActivated(version);
    }

    function activePolicy() external view returns (Policy memory) {
        return policies[activeVersion];
    }

    function activePolicyVersion() external view returns (uint32) {
        return activeVersion;
    }

    function setDisclosureRegistry(address registry) external onlyRole(WHITELIST_ADMIN) {
        disclosureRegistry = IDisclosureRegistry(registry);
        emit DisclosureRegistrySet(registry);
    }

    function setAcceptanceRegistry(address registry) external onlyRole(WHITELIST_ADMIN) {
        acceptanceRegistry = IAcceptanceRegistry(registry);
        emit AcceptanceRegistrySet(registry);
    }

    function setComplianceGate(address gate) external onlyRole(COMPLIANCE_ADMIN) {
        complianceGate = IComplianceGate(gate);
        emit ComplianceGateSet(gate);
    }

    function setRiskScoreRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        riskScoreRegistry = IRiskScoreRegistry(registry);
        emit RiskScoreRegistrySet(registry);
    }

    function setTravelRuleGate(address gate) external onlyRole(COMPLIANCE_ADMIN) {
        travelRuleGate = ITravelRuleGate(gate);
        emit TravelRuleGateSet(gate);
    }

    function setEligibilityRegistry(address registry) external onlyRole(WHITELIST_ADMIN) {
        eligibilityRegistry = IInvestorEligibilityRegistry(registry);
        emit EligibilityRegistrySet(registry);
    }

    function setOfferingRegistry(address registry) external onlyRole(WHITELIST_ADMIN) {
        offeringRegistry = IPrivateOfferingRegistry(registry);
        emit OfferingRegistrySet(registry);
    }

    function validateTransfer(
        address from,
        address to,
        uint256 amount,
        bytes32 assetType,
        bytes32 travelEvidenceId
    ) external view {
        Policy memory policy = policies[activeVersion];
        if (!policy.exists) {
            return;
        }

        if (policy.disclosuresRequired) {
            require(address(disclosureRegistry) != address(0), "disclosure registry not set");
            require(address(acceptanceRegistry) != address(0), "acceptance registry not set");
            uint256 activeDisclosure = disclosureRegistry.activeVersion();
            require(activeDisclosure != 0, "no active disclosure");
            _requireDisclosureAccepted(from, activeDisclosure);
            _requireDisclosureAccepted(to, activeDisclosure);
        }

        if (policy.complianceRequired) {
            require(address(complianceGate) != address(0), "compliance gate not set");
            _validateCompliance(from);
            _validateCompliance(to);
        }

        if (policy.riskScoreRequired) {
            require(address(riskScoreRegistry) != address(0), "risk registry not set");
            _validateRisk(from, policy.maxRiskLevel);
            _validateRisk(to, policy.maxRiskLevel);
        }

        if (policy.eligibilityRequired) {
            require(address(eligibilityRegistry) != address(0), "eligibility registry not set");
            require(address(offeringRegistry) != address(0), "offering registry not set");
            require(policy.offeringId != bytes32(0), "offering id not set");
            require(offeringRegistry.isActive(policy.offeringId), "offering closed");
            _requireEligible(from);
            _requireEligible(to);
        }

        if (policy.travelRuleRequired) {
            require(address(travelRuleGate) != address(0), "travel rule gate not set");
            if (from != address(0) && to != address(0)) {
                travelRuleGate.enforceTravelRule(from, to, amount, assetType, travelEvidenceId);
            }
        }
    }

    function _requireDisclosureAccepted(address wallet, uint256 versionId) internal view {
        if (wallet == address(0)) {
            return;
        }
        require(acceptanceRegistry.hasAccepted(wallet, versionId), "disclosure not accepted");
    }

    function _validateCompliance(address wallet) internal view {
        if (wallet == address(0)) {
            return;
        }
        complianceGate.validate(wallet);
    }

    function _validateRisk(address wallet, uint8 maxRiskLevel) internal view {
        if (wallet == address(0)) {
            return;
        }
        require(riskScoreRegistry.isScoreActiveWallet(wallet), "risk score inactive");
        (IRiskScoreRegistry.RiskLevel level, , , , ) = riskScoreRegistry.scoreOfWallet(wallet);
        require(uint8(level) <= maxRiskLevel, "risk level too high");
    }

    function _requireEligible(address wallet) internal view {
        if (wallet == address(0)) {
            return;
        }
        require(eligibilityRegistry.isEligible(wallet), "investor not eligible");
    }
}
