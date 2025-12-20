// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./TravelRuleConfigRegistry.sol";
import "./TravelRuleEvidenceRegistry.sol";
import "./interfaces/IRiskScoreRegistry.sol";
import "./interfaces/IWalletJurisdictionRegistry.sol";

/// @title TravelRuleGate
/// @notice Determines Travel Rule applicability and enforces evidence requirements.
contract TravelRuleGate is AccessControl {
    bytes32 public constant TRAVEL_ADMIN = keccak256("TRAVEL_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    TravelRuleConfigRegistry public configRegistry;
    TravelRuleEvidenceRegistry public evidenceRegistry;
    IRiskScoreRegistry public riskScoreRegistry;
    IWalletJurisdictionRegistry public jurisdictionRegistry;

    event ConfigRegistrySet(address indexed registry);
    event EvidenceRegistrySet(address indexed registry);
    event RiskScoreRegistrySet(address indexed registry);
    event JurisdictionRegistrySet(address indexed registry);

    constructor(address admin, address configRegistry_, address evidenceRegistry_) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TRAVEL_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(TRAVEL_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, TRAVEL_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);

        configRegistry = TravelRuleConfigRegistry(configRegistry_);
        evidenceRegistry = TravelRuleEvidenceRegistry(evidenceRegistry_);
        emit ConfigRegistrySet(configRegistry_);
        emit EvidenceRegistrySet(evidenceRegistry_);
    }

    function setConfigRegistry(address registry) external onlyRole(TRAVEL_ADMIN) {
        configRegistry = TravelRuleConfigRegistry(registry);
        emit ConfigRegistrySet(registry);
    }

    function setEvidenceRegistry(address registry) external onlyRole(TRAVEL_ADMIN) {
        evidenceRegistry = TravelRuleEvidenceRegistry(registry);
        emit EvidenceRegistrySet(registry);
    }

    function setRiskScoreRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        riskScoreRegistry = IRiskScoreRegistry(registry);
        emit RiskScoreRegistrySet(registry);
    }

    function setJurisdictionRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        jurisdictionRegistry = IWalletJurisdictionRegistry(registry);
        emit JurisdictionRegistrySet(registry);
    }

    function requiresTravelRule(address from, address to, uint256 amount, bytes32 assetType)
        public
        view
        returns (bool)
    {
        TravelRuleConfigRegistry.Config memory config = configRegistry.activeConfig();
        if (!config.exists) {
            return false;
        }

        if (config.amountThreshold > 0 && amount >= config.amountThreshold) {
            return true;
        }

        if (config.riskThresholdEnabled) {
            if (address(riskScoreRegistry) == address(0)) {
                return true;
            }
            if (_exceedsRiskThreshold(from, config.riskThreshold)) {
                return true;
            }
            if (_exceedsRiskThreshold(to, config.riskThreshold)) {
                return true;
            }
        }

        uint32 version = configRegistry.activeConfigVersion();
        if (version != 0 && address(jurisdictionRegistry) != address(0)) {
            bytes32 fromJurisdiction = jurisdictionRegistry.jurisdictionOf(from);
            bytes32 toJurisdiction = jurisdictionRegistry.jurisdictionOf(to);
            if (fromJurisdiction != bytes32(0) && configRegistry.jurisdictionRule(version, fromJurisdiction)) {
                return true;
            }
            if (toJurisdiction != bytes32(0) && configRegistry.jurisdictionRule(version, toJurisdiction)) {
                return true;
            }
        }

        if (version != 0 && assetType != bytes32(0) && configRegistry.assetRule(version, assetType)) {
            return true;
        }

        return false;
    }

    function enforceTravelRule(
        address from,
        address to,
        uint256 amount,
        bytes32 assetType,
        bytes32 evidenceId
    ) external view {
        TravelRuleConfigRegistry.Config memory config = configRegistry.activeConfig();
        if (!config.exists) {
            return;
        }

        if (!requiresTravelRule(from, to, amount, assetType)) {
            return;
        }

        if (config.enforcementMode == TravelRuleConfigRegistry.EnforcementMode.LOG_ONLY) {
            return;
        }

        require(address(evidenceRegistry) != address(0), "evidence registry not set");
        require(evidenceId != bytes32(0), "travel evidence required");

        (TravelRuleEvidenceRegistry.Status status, bool exists) = evidenceRegistry.evidenceStatus(evidenceId);
        require(exists, "evidence missing");

        if (config.enforcementMode == TravelRuleConfigRegistry.EnforcementMode.RESTRICT) {
            require(status != TravelRuleEvidenceRegistry.Status.REJECTED, "evidence rejected");
            return;
        }

        require(status == TravelRuleEvidenceRegistry.Status.VERIFIED, "evidence not verified");
    }

    function _exceedsRiskThreshold(address wallet, uint8 threshold) internal view returns (bool) {
        if (wallet == address(0)) {
            return false;
        }
        if (!riskScoreRegistry.isScoreActiveWallet(wallet)) {
            return true;
        }
        (IRiskScoreRegistry.RiskLevel level, , , , ) = riskScoreRegistry.scoreOfWallet(wallet);
        return uint8(level) >= threshold;
    }
}
