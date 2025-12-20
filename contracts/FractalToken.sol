
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IAcceptanceRegistry.sol";
import "./interfaces/IDisclosureRegistry.sol";
import "./interfaces/ITokenUsePolicy.sol";
import "./interfaces/IWhitelistRegistry.sol";
import "./interfaces/IPrivateOfferingRegistry.sol";
import "./interfaces/IInvestorEligibilityRegistry.sol";
import "./interfaces/ITransferRestrictionPolicy.sol";
import "./interfaces/IComplianceGate.sol";
import "./interfaces/IEntityRegistry.sol";
import "./interfaces/IUBOComplianceGate.sol";
import "./interfaces/IRiskEnforcement.sol";
import "./interfaces/ITravelRuleGate.sol";
import "./interfaces/IWhitelistPolicy.sol";
import "./interfaces/IIdentitySBT.sol";
import "./interfaces/IIdentityPolicyRegistry.sol";
import "./IdentityGates.sol";
import "./interfaces/ITransferRestrictionEngine.sol";

/// @title Fractal Token (FRT)
/// @notice Cohesive ERC20 token with ERC-2612 permit, owner-controlled minting, pausable transfers and simple burn.
contract FractalToken is ERC20, ERC20Permit, Ownable, Pausable {
    uint256 private immutable _initialSupply;
    bytes32 private _pendingPurposeHash;
    bool public enforcementEnabled;
    bool public privateOfferingEnabled;

    IDisclosureRegistry public disclosureRegistry;
    IAcceptanceRegistry public acceptanceRegistry;
    ITokenUsePolicy public tokenUsePolicy;
    IWhitelistRegistry public whitelistRegistry;
    IPrivateOfferingRegistry public offeringRegistry;
    IInvestorEligibilityRegistry public eligibilityRegistry;
    ITransferRestrictionPolicy public transferRestrictionPolicy;
    bytes32 public offeringId;
    IComplianceGate public complianceGate;
    bool public complianceEnabled;
    IEntityRegistry public entityRegistry;
    IUBOComplianceGate public uboComplianceGate;
    bool public uboComplianceEnabled;
    IRiskEnforcement public riskEnforcement;
    bool public riskLimitsEnabled;
    ITravelRuleGate public travelRuleGate;
    bool public travelRuleEnabled;
    bytes32 public assetType;
    bytes32 private _pendingTravelRuleEvidenceId;
    IWhitelistPolicy public whitelistPolicy;
    bool public whitelistPolicyEnabled;
    IIdentitySBT public identitySBT;
    IIdentityPolicyRegistry public identityPolicyRegistry;
    bool public identitySBTEnabled;
    ITransferRestrictionEngine public transferRestrictionEngine;
    bool public advancedRestrictionsEnabled;
    bytes32 private _pendingSeriesId;
    bool public localWhitelistEnabled;
    mapping(address => bool) private _localWhitelist;

    event EnforcementEnabled(bool enabled);
    event PrivateOfferingEnabled(bool enabled);
    event DisclosureRegistrySet(address indexed registry);
    event AcceptanceRegistrySet(address indexed registry);
    event TokenUsePolicySet(address indexed policy);
    event WhitelistRegistrySet(address indexed registry);
    event PrivateOfferingRegistrySet(address indexed registry);
    event InvestorEligibilityRegistrySet(address indexed registry);
    event TransferRestrictionPolicySet(address indexed policy);
    event OfferingIdSet(bytes32 indexed offeringId);
    event ComplianceGateSet(address indexed gate);
    event ComplianceEnabled(bool enabled);
    event EntityRegistrySet(address indexed registry);
    event UBOComplianceGateSet(address indexed gate);
    event UBOComplianceEnabled(bool enabled);
    event RiskEnforcementSet(address indexed enforcement);
    event RiskLimitsEnabled(bool enabled);
    event TravelRuleGateSet(address indexed gate);
    event TravelRuleEnabled(bool enabled);
    event AssetTypeSet(bytes32 assetType);
    event TravelRuleEvidenceSet(bytes32 evidenceId);
    event WhitelistPolicySet(address indexed policy);
    event WhitelistPolicyEnabled(bool enabled);
    event IdentitySBTSet(address indexed sbt);
    event IdentityPolicyRegistrySet(address indexed registry);
    event IdentitySBTEnabled(bool enabled);
    event TransferRestrictionEngineSet(address indexed engine);
    event AdvancedRestrictionsEnabled(bool enabled);
    event SeriesIdSet(bytes32 seriesId);
    event LocalWhitelistUpdated(address indexed account, bool allowed);
    event LocalWhitelistEnabled(bool enabled);

    constructor(uint256 initialSupply_)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
    {
        _initialSupply = initialSupply_;
        enforcementEnabled = false;
        riskLimitsEnabled = false;
        travelRuleEnabled = false;
        assetType = keccak256(abi.encodePacked("FRT"));
        whitelistPolicyEnabled = false;
        identitySBTEnabled = false;
        advancedRestrictionsEnabled = false;
        _mint(msg.sender, initialSupply_);
    }

    /// @notice Return the initial supply minted at deployment.
    function initialSupply() external view returns (uint256) {
        return _initialSupply;
    }

    /// @notice Mint new tokens. Only owner can call.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burn caller's tokens.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Pause all token transfers. Callable only by the owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token transfers. Callable only by the owner.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Toggle compliance enforcement for transfers.
    function setEnforcementEnabled(bool enabled) external onlyOwner {
        enforcementEnabled = enabled;
        emit EnforcementEnabled(enabled);
    }

    /// @notice Toggle private offering enforcement for transfers.
    function setPrivateOfferingEnabled(bool enabled) external onlyOwner {
        privateOfferingEnabled = enabled;
        emit PrivateOfferingEnabled(enabled);
    }

    /// @notice Set disclosure registry used for active version checks.
    function setDisclosureRegistry(address registry) external onlyOwner {
        disclosureRegistry = IDisclosureRegistry(registry);
        emit DisclosureRegistrySet(registry);
    }

    /// @notice Set acceptance registry used to validate disclosure acceptance.
    function setAcceptanceRegistry(address registry) external onlyOwner {
        acceptanceRegistry = IAcceptanceRegistry(registry);
        emit AcceptanceRegistrySet(registry);
    }

    /// @notice Set token use policy for enforcement.
    function setTokenUsePolicy(address policy) external onlyOwner {
        tokenUsePolicy = ITokenUsePolicy(policy);
        emit TokenUsePolicySet(policy);
    }

    /// @notice Set external whitelist registry (disables local whitelist).
    function setWhitelistRegistry(address registry) external onlyOwner {
        whitelistRegistry = IWhitelistRegistry(registry);
        localWhitelistEnabled = false;
        emit WhitelistRegistrySet(registry);
    }

    /// @notice Set the private offering registry.
    function setPrivateOfferingRegistry(address registry) external onlyOwner {
        offeringRegistry = IPrivateOfferingRegistry(registry);
        emit PrivateOfferingRegistrySet(registry);
    }

    /// @notice Set investor eligibility registry.
    function setInvestorEligibilityRegistry(address registry) external onlyOwner {
        eligibilityRegistry = IInvestorEligibilityRegistry(registry);
        emit InvestorEligibilityRegistrySet(registry);
    }

    /// @notice Set transfer restriction policy.
    function setTransferRestrictionPolicy(address policy) external onlyOwner {
        transferRestrictionPolicy = ITransferRestrictionPolicy(policy);
        emit TransferRestrictionPolicySet(policy);
    }

    /// @notice Set the active offering identifier for private offerings.
    function setOfferingId(bytes32 newOfferingId) external onlyOwner {
        offeringId = newOfferingId;
        emit OfferingIdSet(newOfferingId);
    }

    /// @notice Set compliance gate for AML/KYC enforcement.
    function setComplianceGate(address gate) external onlyOwner {
        complianceGate = IComplianceGate(gate);
        emit ComplianceGateSet(gate);
    }

    /// @notice Toggle compliance enforcement for AML/KYC.
    function setComplianceEnabled(bool enabled) external onlyOwner {
        complianceEnabled = enabled;
        emit ComplianceEnabled(enabled);
    }

    /// @notice Set entity registry for corporate wallet mapping.
    function setEntityRegistry(address registry) external onlyOwner {
        entityRegistry = IEntityRegistry(registry);
        emit EntityRegistrySet(registry);
    }

    /// @notice Set UBO compliance gate for corporate structures.
    function setUBOComplianceGate(address gate) external onlyOwner {
        uboComplianceGate = IUBOComplianceGate(gate);
        emit UBOComplianceGateSet(gate);
    }

    /// @notice Toggle UBO compliance enforcement.
    function setUBOComplianceEnabled(bool enabled) external onlyOwner {
        uboComplianceEnabled = enabled;
        emit UBOComplianceEnabled(enabled);
    }

    /// @notice Set risk enforcement contract for AML risk limits.
    function setRiskEnforcement(address enforcement) external onlyOwner {
        riskEnforcement = IRiskEnforcement(enforcement);
        emit RiskEnforcementSet(enforcement);
    }

    /// @notice Toggle risk limit enforcement.
    function setRiskLimitsEnabled(bool enabled) external onlyOwner {
        riskLimitsEnabled = enabled;
        emit RiskLimitsEnabled(enabled);
    }

    /// @notice Set Travel Rule gate for enforcement.
    function setTravelRuleGate(address gate) external onlyOwner {
        travelRuleGate = ITravelRuleGate(gate);
        emit TravelRuleGateSet(gate);
    }

    /// @notice Toggle Travel Rule enforcement.
    function setTravelRuleEnabled(bool enabled) external onlyOwner {
        travelRuleEnabled = enabled;
        emit TravelRuleEnabled(enabled);
    }

    /// @notice Set asset type hash used for Travel Rule decisions.
    function setAssetType(bytes32 newAssetType) external onlyOwner {
        assetType = newAssetType;
        emit AssetTypeSet(newAssetType);
    }

    /// @notice Set Travel Rule evidence id for the next transfer.
    function setTravelRuleEvidence(bytes32 evidenceId) external {
        _pendingTravelRuleEvidenceId = evidenceId;
        emit TravelRuleEvidenceSet(evidenceId);
    }

    /// @notice Set whitelist policy contract for enforcement.
    function setWhitelistPolicy(address policy) external onlyOwner {
        whitelistPolicy = IWhitelistPolicy(policy);
        emit WhitelistPolicySet(policy);
    }

    /// @notice Toggle whitelist policy enforcement.
    function setWhitelistPolicyEnabled(bool enabled) external onlyOwner {
        whitelistPolicyEnabled = enabled;
        emit WhitelistPolicyEnabled(enabled);
    }

    /// @notice Set identity SBT contract for enforcement.
    function setIdentitySBT(address sbt) external onlyOwner {
        identitySBT = IIdentitySBT(sbt);
        emit IdentitySBTSet(sbt);
    }

    /// @notice Set identity policy registry for SBT enforcement.
    function setIdentityPolicyRegistry(address registry) external onlyOwner {
        identityPolicyRegistry = IIdentityPolicyRegistry(registry);
        emit IdentityPolicyRegistrySet(registry);
    }

    /// @notice Toggle identity SBT enforcement.
    function setIdentitySBTEnabled(bool enabled) external onlyOwner {
        identitySBTEnabled = enabled;
        emit IdentitySBTEnabled(enabled);
    }

    /// @notice Set advanced transfer restriction engine.
    function setTransferRestrictionEngine(address engine) external onlyOwner {
        transferRestrictionEngine = ITransferRestrictionEngine(engine);
        emit TransferRestrictionEngineSet(engine);
    }

    /// @notice Toggle advanced restriction enforcement.
    function setAdvancedRestrictionsEnabled(bool enabled) external onlyOwner {
        advancedRestrictionsEnabled = enabled;
        emit AdvancedRestrictionsEnabled(enabled);
    }

    /// @notice Set the series id for the next transfer.
    function setSeriesId(bytes32 seriesId) external {
        _pendingSeriesId = seriesId;
        emit SeriesIdSet(seriesId);
    }

    /// @notice Enable or disable local whitelist fallback.
    function setLocalWhitelistEnabled(bool enabled) external onlyOwner {
        localWhitelistEnabled = enabled;
        emit LocalWhitelistEnabled(enabled);
    }

    /// @notice Manage the local whitelist when enabled.
    function setLocalWhitelist(address account, bool allowed) external onlyOwner {
        _localWhitelist[account] = allowed;
        emit LocalWhitelistUpdated(account, allowed);
    }

    /// @dev Prevent token transfers while paused by using the ERC-20 hook.
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20)
    {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "FractalToken: token transfer while paused");
        _enforcePolicies(from, to);
        _enforcePrivateOffering(from, to);
        _enforceCompliance(from, to);
        _enforceUBOCompliance(from, to);
        _enforceRiskLimits(from, to, amount);
        _enforceTravelRule(from, to, amount);
        _enforceWhitelistPolicy(from, to, amount);
        _enforceIdentitySBT(from, to);
        _enforceAdvancedRestrictions(from, to, amount);
    }

    /// @dev Clear any pending purpose hash after transfers/burns/mints.
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20)
    {
        super._afterTokenTransfer(from, to, amount);
        _pendingPurposeHash = bytes32(0);
        _pendingTravelRuleEvidenceId = bytes32(0);
        _pendingSeriesId = bytes32(0);
    }

    function _enforcePolicies(address from, address to) internal view {
        if (!enforcementEnabled) {
            return;
        }

        require(address(tokenUsePolicy) != address(0), "policy not set");

        if (tokenUsePolicy.whitelistRequired()) {
            require(_isWhitelistConfigured(), "whitelist not configured");
            _requireWhitelisted(from);
            _requireWhitelisted(to);
        }

        if (tokenUsePolicy.disclosuresRequired()) {
            require(address(disclosureRegistry) != address(0), "disclosure registry not set");
            require(address(acceptanceRegistry) != address(0), "acceptance registry not set");
            uint256 activeVersion = disclosureRegistry.activeVersion();
            require(activeVersion != 0, "no active disclosure");
            _requireDisclosureAccepted(from, activeVersion);
            _requireDisclosureAccepted(to, activeVersion);
        }

        if (tokenUsePolicy.jurisdictionRequired()) {
            _requireJurisdictionAllowed(from);
            _requireJurisdictionAllowed(to);
        }

        if (tokenUsePolicy.lockupRequired() && from != address(0)) {
            uint64 lockup = tokenUsePolicy.lockupUntil(from);
            require(lockup == 0 || block.timestamp >= lockup, "lockup active");
        }

        if (tokenUsePolicy.paymentRestricted() && from != address(0) && to != address(0)) {
            require(_pendingPurposeHash != bytes32(0), "purpose required");
            require(tokenUsePolicy.isPurposeAllowed(_pendingPurposeHash), "purpose not allowed");
        }
    }

    function _enforcePrivateOffering(address from, address to) internal view {
        if (!privateOfferingEnabled) {
            return;
        }
        require(address(offeringRegistry) != address(0), "offering registry not set");
        require(address(eligibilityRegistry) != address(0), "eligibility registry not set");
        require(address(transferRestrictionPolicy) != address(0), "restriction policy not set");
        require(offeringId != bytes32(0), "offering id not set");
        require(offeringRegistry.isActive(offeringId), "offering closed");

        if (!transferRestrictionPolicy.enforcementEnabled()) {
            return;
        }

        if (transferRestrictionPolicy.eligibilityRequired()) {
            _requireEligible(from);
            _requireEligible(to);
        }

        if (transferRestrictionPolicy.jurisdictionRequired()) {
            _requireJurisdictionAllowed(from);
            _requireJurisdictionAllowed(to);
        }

        if (from != address(0)) {
            uint64 lockup = transferRestrictionPolicy.lockupUntil(from);
            require(lockup == 0 || block.timestamp >= lockup, "lockup active");
        }
    }

    function _enforceCompliance(address from, address to) internal view {
        if (!complianceEnabled) {
            return;
        }
        require(address(complianceGate) != address(0), "compliance gate not set");
        if (from != address(0)) {
            complianceGate.validate(from);
        }
        if (to != address(0)) {
            complianceGate.validate(to);
        }
    }

    function _enforceUBOCompliance(address from, address to) internal view {
        if (!uboComplianceEnabled) {
            return;
        }
        require(address(entityRegistry) != address(0), "entity registry not set");
        require(address(uboComplianceGate) != address(0), "UBO gate not set");
        if (from != address(0) && entityRegistry.entityOf(from) != bytes32(0)) {
            uboComplianceGate.validateWallet(from);
        }
        if (to != address(0) && entityRegistry.entityOf(to) != bytes32(0)) {
            uboComplianceGate.validateWallet(to);
        }
    }

    function _enforceRiskLimits(address from, address to, uint256 amount) internal {
        if (!riskLimitsEnabled) {
            return;
        }
        require(address(riskEnforcement) != address(0), "risk enforcement not set");
        if (from != address(0)) {
            riskEnforcement.consumeQuota(from, _actionTransfer(), amount);
        }
        if (to != address(0)) {
            riskEnforcement.consumeQuota(to, _actionReceive(), amount);
        }
    }

    function _enforceTravelRule(address from, address to, uint256 amount) internal view {
        if (!travelRuleEnabled) {
            return;
        }
        if (from == address(0) || to == address(0)) {
            return;
        }
        require(address(travelRuleGate) != address(0), "travel rule gate not set");
        travelRuleGate.enforceTravelRule(from, to, amount, assetType, _pendingTravelRuleEvidenceId);
    }

    function _enforceWhitelistPolicy(address from, address to, uint256 amount) internal view {
        if (!whitelistPolicyEnabled) {
            return;
        }
        require(_isWhitelistConfigured(), "whitelist not configured");
        _requireWhitelisted(from);
        _requireWhitelisted(to);
        if (address(whitelistPolicy) != address(0)) {
            whitelistPolicy.validateTransfer(from, to, amount, assetType, _pendingTravelRuleEvidenceId);
        }
    }

    function _enforceIdentitySBT(address from, address to) internal view {
        if (!identitySBTEnabled) {
            return;
        }
        IdentityGates.enforceTransfer(identitySBT, identityPolicyRegistry, from, to);
    }

    function _enforceAdvancedRestrictions(address from, address to, uint256 amount) internal {
        if (!advancedRestrictionsEnabled) {
            return;
        }
        require(address(transferRestrictionEngine) != address(0), "restriction engine not set");
        transferRestrictionEngine.validateTransfer(
            from,
            to,
            amount,
            _pendingSeriesId,
            assetType,
            _pendingTravelRuleEvidenceId
        );
    }

    function _actionReceive() internal pure returns (uint256) {
        return 1 << 0;
    }

    function _actionTransfer() internal pure returns (uint256) {
        return 1 << 1;
    }

    function _requireEligible(address account) internal view {
        if (account == address(0)) {
            return;
        }
        require(eligibilityRegistry.isEligible(account), "investor not eligible");
    }

    function _requireWhitelisted(address account) internal view {
        if (account == address(0)) {
            return;
        }
        require(_isWhitelisted(account), "not whitelisted");
    }

    function _isWhitelistConfigured() internal view returns (bool) {
        return address(whitelistRegistry) != address(0) || localWhitelistEnabled;
    }

    function _isWhitelisted(address account) internal view returns (bool) {
        if (address(whitelistRegistry) != address(0)) {
            return whitelistRegistry.isWhitelisted(account);
        }
        if (localWhitelistEnabled) {
            return _localWhitelist[account];
        }
        return false;
    }

    function _requireDisclosureAccepted(address account, uint256 versionId) internal view {
        if (account == address(0)) {
            return;
        }
        require(acceptanceRegistry.hasAccepted(account, versionId), "disclosure not accepted");
    }

    function _requireJurisdictionAllowed(address account) internal view {
        if (account == address(0)) {
            return;
        }
        if (privateOfferingEnabled && address(eligibilityRegistry) != address(0)) {
            bytes32 jurisdiction = eligibilityRegistry.jurisdictionOf(account);
            require(jurisdiction != bytes32(0), "jurisdiction missing");
            require(offeringRegistry.isJurisdictionAllowed(offeringId, jurisdiction), "jurisdiction blocked");
            return;
        }
        require(tokenUsePolicy.isJurisdictionAllowed(account), "jurisdiction blocked");
    }

    /// @notice Helper to perform transfer with a purpose hash (stored temporarily).
    function transferWithPurpose(address to, uint256 amount, bytes32 purposeHash) external returns (bool) {
        _pendingPurposeHash = purposeHash;
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Helper to mint with a purpose hash (only owner).
    function mintWithPurpose(address to, uint256 amount, bytes32 purposeHash) external onlyOwner {
        _pendingPurposeHash = purposeHash;
        _mint(to, amount);
    }

    /// @notice Helper to burn with a purpose hash.
    function burnWithPurpose(uint256 amount, bytes32 purposeHash) external {
        _pendingPurposeHash = purposeHash;
        _burn(msg.sender, amount);
    }

    /// @notice Helper to transfer with a Travel Rule evidence id.
    function transferWithTravelRule(address to, uint256 amount, bytes32 evidenceId) external returns (bool) {
        _pendingTravelRuleEvidenceId = evidenceId;
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Helper to transfer with a series id.
    function transferWithSeries(address to, uint256 amount, bytes32 seriesId) external returns (bool) {
        _pendingSeriesId = seriesId;
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Helper to transfer with series id and travel rule evidence.
    function transferWithSeriesAndTravelRule(
        address to,
        uint256 amount,
        bytes32 seriesId,
        bytes32 evidenceId
    ) external returns (bool) {
        _pendingSeriesId = seriesId;
        _pendingTravelRuleEvidenceId = evidenceId;
        _transfer(msg.sender, to, amount);
        return true;
    }
}

