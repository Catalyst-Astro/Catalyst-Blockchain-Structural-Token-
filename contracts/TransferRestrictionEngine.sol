// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./SeriesRegistry.sol";
import "./LockupRegistry.sol";
import "./JurisdictionRegistry.sol";
import "./JurisdictionPolicyRegistry.sol";
import "./interfaces/IWhitelistRegistry.sol";
import "./interfaces/IIdentitySBT.sol";
import "./interfaces/IDisclosureRegistry.sol";
import "./interfaces/IAcceptanceRegistry.sol";
import "./interfaces/IInvestorEligibilityRegistry.sol";
import "./interfaces/IPrivateOfferingRegistry.sol";
import "./interfaces/IRiskScoreRegistry.sol";
import "./interfaces/ITravelRuleGate.sol";

/// @title TransferRestrictionEngine
/// @notice Enforces advanced transfer restrictions by series, jurisdiction, lockups, and compliance gates.
contract TransferRestrictionEngine is AccessControl {
    bytes32 public constant SERIES_ADMIN = keccak256("SERIES_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    enum IdentityMode {
        NONE,
        WHITELIST_ONLY,
        SBT_ONLY,
        WHITELIST_OR_SBT,
        WHITELIST_AND_SBT
    }

    enum ReasonCode {
        NONE,
        SERIES_INACTIVE,
        IDENTITY_MISSING,
        DISCLOSURE_MISSING,
        ELIGIBILITY_MISSING,
        LOCKUP_ACTIVE,
        JURISDICTION_BLOCKED,
        RISK_TOO_HIGH,
        TRAVEL_RULE_MISSING
    }

    struct Policy {
        IdentityMode identityMode;
        bool disclosuresRequired;
        bool eligibilityRequired;
        bool lockupRequired;
        bool jurisdictionRequired;
        bool riskRequired;
        uint8 maxRiskLevel;
        bool travelRuleRequired;
        bool seriesActiveRequired;
        bytes32 offeringId;
        bytes32 policyHash;
        uint32 version;
        bool exists;
    }

    mapping(uint32 => Policy) private policies;
    uint32 private activeVersion;
    uint32 private nextVersion;

    SeriesRegistry public seriesRegistry;
    LockupRegistry public lockupRegistry;
    JurisdictionRegistry public jurisdictionRegistry;
    JurisdictionPolicyRegistry public jurisdictionPolicyRegistry;
    IWhitelistRegistry public whitelistRegistry;
    IIdentitySBT public identitySbt;
    IDisclosureRegistry public disclosureRegistry;
    IAcceptanceRegistry public acceptanceRegistry;
    IInvestorEligibilityRegistry public eligibilityRegistry;
    IPrivateOfferingRegistry public offeringRegistry;
    IRiskScoreRegistry public riskScoreRegistry;
    ITravelRuleGate public travelRuleGate;

    event PolicyPublished(uint32 version, bytes32 policyHash);
    event PolicyActivated(uint32 version);
    event TransferValidated(bytes32 indexed seriesId, address indexed from, address indexed to, uint256 amount);
    event TransferBlocked(bytes32 indexed seriesId, address indexed from, address indexed to, uint256 amount, ReasonCode reason);
    event SeriesRegistrySet(address indexed registry);
    event LockupRegistrySet(address indexed registry);
    event JurisdictionRegistrySet(address indexed registry);
    event JurisdictionPolicyRegistrySet(address indexed registry);
    event WhitelistRegistrySet(address indexed registry);
    event IdentitySbtSet(address indexed sbt);
    event DisclosureRegistrySet(address indexed registry);
    event AcceptanceRegistrySet(address indexed registry);
    event EligibilityRegistrySet(address indexed registry);
    event OfferingRegistrySet(address indexed registry);
    event RiskScoreRegistrySet(address indexed registry);
    event TravelRuleGateSet(address indexed gate);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SERIES_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(SERIES_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, SERIES_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishPolicy(
        IdentityMode identityMode,
        bool disclosuresRequired,
        bool eligibilityRequired,
        bool lockupRequired,
        bool jurisdictionRequired,
        bool riskRequired,
        uint8 maxRiskLevel,
        bool travelRuleRequired,
        bool seriesActiveRequired,
        bytes32 offeringId,
        bytes32 policyHash
    ) external onlyRole(SERIES_ADMIN) returns (uint32 version) {
        version = nextVersion + 1;
        nextVersion = version;
        policies[version] = Policy({
            identityMode: identityMode,
            disclosuresRequired: disclosuresRequired,
            eligibilityRequired: eligibilityRequired,
            lockupRequired: lockupRequired,
            jurisdictionRequired: jurisdictionRequired,
            riskRequired: riskRequired,
            maxRiskLevel: maxRiskLevel,
            travelRuleRequired: travelRuleRequired,
            seriesActiveRequired: seriesActiveRequired,
            offeringId: offeringId,
            policyHash: policyHash,
            version: version,
            exists: true
        });
        emit PolicyPublished(version, policyHash);
    }

    function activatePolicy(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(policies[version].exists, "policy missing");
        activeVersion = version;
        emit PolicyActivated(version);
    }

    function setSeriesRegistry(address registry) external onlyRole(SERIES_ADMIN) {
        seriesRegistry = SeriesRegistry(registry);
        emit SeriesRegistrySet(registry);
    }

    function setLockupRegistry(address registry) external onlyRole(SERIES_ADMIN) {
        lockupRegistry = LockupRegistry(registry);
        emit LockupRegistrySet(registry);
    }

    function setJurisdictionRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        jurisdictionRegistry = JurisdictionRegistry(registry);
        emit JurisdictionRegistrySet(registry);
    }

    function setJurisdictionPolicyRegistry(address registry) external onlyRole(SERIES_ADMIN) {
        jurisdictionPolicyRegistry = JurisdictionPolicyRegistry(registry);
        emit JurisdictionPolicyRegistrySet(registry);
    }

    function setWhitelistRegistry(address registry) external onlyRole(SERIES_ADMIN) {
        whitelistRegistry = IWhitelistRegistry(registry);
        emit WhitelistRegistrySet(registry);
    }

    function setIdentitySbt(address sbt) external onlyRole(COMPLIANCE_ADMIN) {
        identitySbt = IIdentitySBT(sbt);
        emit IdentitySbtSet(sbt);
    }

    function setDisclosureRegistry(address registry) external onlyRole(SERIES_ADMIN) {
        disclosureRegistry = IDisclosureRegistry(registry);
        emit DisclosureRegistrySet(registry);
    }

    function setAcceptanceRegistry(address registry) external onlyRole(SERIES_ADMIN) {
        acceptanceRegistry = IAcceptanceRegistry(registry);
        emit AcceptanceRegistrySet(registry);
    }

    function setEligibilityRegistry(address registry) external onlyRole(SERIES_ADMIN) {
        eligibilityRegistry = IInvestorEligibilityRegistry(registry);
        emit EligibilityRegistrySet(registry);
    }

    function setOfferingRegistry(address registry) external onlyRole(SERIES_ADMIN) {
        offeringRegistry = IPrivateOfferingRegistry(registry);
        emit OfferingRegistrySet(registry);
    }

    function setRiskScoreRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        riskScoreRegistry = IRiskScoreRegistry(registry);
        emit RiskScoreRegistrySet(registry);
    }

    function setTravelRuleGate(address gate) external onlyRole(COMPLIANCE_ADMIN) {
        travelRuleGate = ITravelRuleGate(gate);
        emit TravelRuleGateSet(gate);
    }

    function validateTransfer(
        address from,
        address to,
        uint256 amount,
        bytes32 seriesId,
        bytes32 assetType,
        bytes32 travelEvidenceId
    ) external {
        (bool allowed, ReasonCode reason) = checkTransfer(from, to, amount, seriesId, assetType, travelEvidenceId);
        require(allowed, "transfer restricted");
        emit TransferValidated(seriesId, from, to, amount);
    }

    function checkTransfer(
        address from,
        address to,
        uint256 amount,
        bytes32 seriesId,
        bytes32 assetType,
        bytes32 travelEvidenceId
    ) public view returns (bool allowed, ReasonCode reason) {
        Policy memory policy = _policyForSeries(seriesId);
        if (!policy.exists) {
            return (true, ReasonCode.NONE);
        }

        if (policy.seriesActiveRequired && !_isSeriesActive(seriesId)) {
            return (false, ReasonCode.SERIES_INACTIVE);
        }

        if (!_passesIdentity(policy.identityMode, from, to)) {
            return (false, ReasonCode.IDENTITY_MISSING);
        }

        if (policy.disclosuresRequired && !_hasAcceptedDisclosures(from, to)) {
            return (false, ReasonCode.DISCLOSURE_MISSING);
        }

        if (policy.eligibilityRequired && !_isEligible(policy.offeringId, from, to)) {
            return (false, ReasonCode.ELIGIBILITY_MISSING);
        }

        if (policy.lockupRequired && !_isLockupSatisfied(from, seriesId)) {
            return (false, ReasonCode.LOCKUP_ACTIVE);
        }

        if (policy.jurisdictionRequired && !_isJurisdictionAllowed(seriesId, from, to)) {
            return (false, ReasonCode.JURISDICTION_BLOCKED);
        }

        if (policy.riskRequired && !_isRiskAllowed(from, to, policy.maxRiskLevel)) {
            return (false, ReasonCode.RISK_TOO_HIGH);
        }

        if (policy.travelRuleRequired && !_isTravelRuleSatisfied(from, to, amount, assetType, travelEvidenceId)) {
            return (false, ReasonCode.TRAVEL_RULE_MISSING);
        }

        return (true, ReasonCode.NONE);
    }

    function recordBlockedTransfer(
        bytes32 seriesId,
        address from,
        address to,
        uint256 amount,
        ReasonCode reason
    ) external onlyRole(COMPLIANCE_ADMIN) {
        emit TransferBlocked(seriesId, from, to, amount, reason);
    }

    function activePolicy() external view returns (Policy memory) {
        return policies[activeVersion];
    }

    function activePolicyVersion() external view returns (uint32) {
        return activeVersion;
    }

    function policyOf(uint32 version) external view returns (Policy memory) {
        return policies[version];
    }

    function _policyForSeries(bytes32 seriesId) internal view returns (Policy memory) {
        if (seriesId != bytes32(0) && address(seriesRegistry) != address(0)) {
            SeriesRegistry.SeriesInfo memory info = seriesRegistry.seriesInfo(seriesId);
            if (info.policyVersion != 0) {
                return policies[info.policyVersion];
            }
        }
        return policies[activeVersion];
    }

    function _isSeriesActive(bytes32 seriesId) internal view returns (bool) {
        if (seriesId == bytes32(0) || address(seriesRegistry) == address(0)) {
            return true;
        }
        SeriesRegistry.SeriesInfo memory info = seriesRegistry.seriesInfo(seriesId);
        if (info.createdAt == 0) {
            return false;
        }
        return info.status == SeriesRegistry.Status.ACTIVE;
    }

    function _passesIdentity(IdentityMode mode, address from, address to) internal view returns (bool) {
        if (mode == IdentityMode.NONE) {
            return true;
        }
        bool fromOk = _identityOk(mode, from);
        bool toOk = _identityOk(mode, to);
        return fromOk && toOk;
    }

    function _identityOk(IdentityMode mode, address wallet) internal view returns (bool) {
        if (wallet == address(0)) {
            return true;
        }
        bool whitelistOk = _isWhitelisted(wallet);
        bool sbtOk = _hasValidSbt(wallet);

        if (mode == IdentityMode.WHITELIST_ONLY) {
            return whitelistOk;
        }
        if (mode == IdentityMode.SBT_ONLY) {
            return sbtOk;
        }
        if (mode == IdentityMode.WHITELIST_OR_SBT) {
            return whitelistOk || sbtOk;
        }
        if (mode == IdentityMode.WHITELIST_AND_SBT) {
            return whitelistOk && sbtOk;
        }
        return true;
    }

    function _isWhitelisted(address wallet) internal view returns (bool) {
        if (address(whitelistRegistry) == address(0)) {
            return false;
        }
        return whitelistRegistry.isWhitelisted(wallet);
    }

    function _hasValidSbt(address wallet) internal view returns (bool) {
        if (address(identitySbt) == address(0)) {
            return false;
        }
        return identitySbt.isIdentityValid(wallet);
    }

    function _hasAcceptedDisclosures(address from, address to) internal view returns (bool) {
        if (address(disclosureRegistry) == address(0) || address(acceptanceRegistry) == address(0)) {
            return false;
        }
        uint256 activeDisclosure = disclosureRegistry.activeVersion();
        if (activeDisclosure == 0) {
            return false;
        }
        if (from != address(0) && !acceptanceRegistry.hasAccepted(from, activeDisclosure)) {
            return false;
        }
        if (to != address(0) && !acceptanceRegistry.hasAccepted(to, activeDisclosure)) {
            return false;
        }
        return true;
    }

    function _isEligible(bytes32 offeringId, address from, address to) internal view returns (bool) {
        if (address(eligibilityRegistry) == address(0) || address(offeringRegistry) == address(0)) {
            return false;
        }
        if (offeringId == bytes32(0) || !offeringRegistry.isActive(offeringId)) {
            return false;
        }
        if (from != address(0) && !eligibilityRegistry.isEligible(from)) {
            return false;
        }
        if (to != address(0) && !eligibilityRegistry.isEligible(to)) {
            return false;
        }
        return true;
    }

    function _isLockupSatisfied(address from, bytes32 seriesId) internal view returns (bool) {
        if (from == address(0) || address(lockupRegistry) == address(0)) {
            return true;
        }
        return !lockupRegistry.isLocked(from, seriesId);
    }

    function _isJurisdictionAllowed(bytes32 seriesId, address from, address to)
        internal
        view
        returns (bool)
    {
        if (address(jurisdictionRegistry) == address(0) || address(jurisdictionPolicyRegistry) == address(0)) {
            return true;
        }
        uint32 policyVersion = jurisdictionPolicyRegistry.activePolicyVersion();
        if (policyVersion == 0) {
            return true;
        }
        bytes32 fromJurisdiction = from == address(0) ? bytes32(0) : jurisdictionRegistry.jurisdictionOf(from);
        bytes32 toJurisdiction = to == address(0) ? bytes32(0) : jurisdictionRegistry.jurisdictionOf(to);
        if (!jurisdictionPolicyRegistry.isJurisdictionAllowed(policyVersion, seriesId, fromJurisdiction)) {
            return false;
        }
        return jurisdictionPolicyRegistry.isJurisdictionAllowed(policyVersion, seriesId, toJurisdiction);
    }

    function _isRiskAllowed(address from, address to, uint8 maxRiskLevel) internal view returns (bool) {
        if (address(riskScoreRegistry) == address(0)) {
            return false;
        }
        if (!_isRiskAllowedForWallet(from, maxRiskLevel)) {
            return false;
        }
        return _isRiskAllowedForWallet(to, maxRiskLevel);
    }

    function _isRiskAllowedForWallet(address wallet, uint8 maxRiskLevel) internal view returns (bool) {
        if (wallet == address(0)) {
            return true;
        }
        if (!riskScoreRegistry.isScoreActiveWallet(wallet)) {
            return false;
        }
        (IRiskScoreRegistry.RiskLevel level, , , , ) = riskScoreRegistry.scoreOfWallet(wallet);
        return uint8(level) <= maxRiskLevel;
    }

    function _isTravelRuleSatisfied(
        address from,
        address to,
        uint256 amount,
        bytes32 assetType,
        bytes32 travelEvidenceId
    ) internal view returns (bool) {
        if (from == address(0) || to == address(0)) {
            return true;
        }
        if (address(travelRuleGate) == address(0)) {
            return false;
        }
        try travelRuleGate.enforceTravelRule(from, to, amount, assetType, travelEvidenceId) {
            return true;
        } catch {
            return false;
        }
    }
}
