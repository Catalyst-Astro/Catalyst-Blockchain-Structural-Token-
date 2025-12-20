// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title TravelRuleConfigRegistry
/// @notice Versioned Travel Rule thresholds and policies.
contract TravelRuleConfigRegistry is AccessControl {
    bytes32 public constant TRAVEL_ADMIN = keccak256("TRAVEL_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    enum EnforcementMode {
        LOG_ONLY,
        RESTRICT,
        BLOCK
    }

    struct Config {
        uint256 amountThreshold;
        uint8 riskThreshold;
        bool riskThresholdEnabled;
        EnforcementMode enforcementMode;
        uint32 version;
        bytes32 policyHash;
        bool exists;
    }

    mapping(uint32 => Config) private configs;
    mapping(uint32 => mapping(bytes32 => bool)) private jurisdictionRequired;
    mapping(uint32 => mapping(bytes32 => bool)) private assetRequired;
    uint32 private activeVersion;
    uint32 private nextVersion;

    event TravelRuleConfigPublished(uint32 version, bytes32 policyHash);
    event TravelRuleConfigActivated(uint32 version);
    event JurisdictionRuleSet(uint32 version, bytes32 indexed jurisdiction, bool required);
    event AssetRuleSet(uint32 version, bytes32 indexed assetType, bool required);

    constructor(address admin) {
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
    }

    function publishConfig(
        uint256 amountThreshold,
        uint8 riskThreshold,
        bool riskThresholdEnabled,
        EnforcementMode enforcementMode,
        bytes32 policyHash
    ) external onlyRole(TRAVEL_ADMIN) returns (uint32 version) {
        version = nextVersion + 1;
        nextVersion = version;
        configs[version] = Config({
            amountThreshold: amountThreshold,
            riskThreshold: riskThreshold,
            riskThresholdEnabled: riskThresholdEnabled,
            enforcementMode: enforcementMode,
            version: version,
            policyHash: policyHash,
            exists: true
        });
        emit TravelRuleConfigPublished(version, policyHash);
    }

    function activateConfig(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(configs[version].exists, "config missing");
        activeVersion = version;
        emit TravelRuleConfigActivated(version);
    }

    function setJurisdictionRule(uint32 version, bytes32 jurisdiction, bool required)
        external
        onlyRole(TRAVEL_ADMIN)
    {
        require(configs[version].exists, "config missing");
        jurisdictionRequired[version][jurisdiction] = required;
        emit JurisdictionRuleSet(version, jurisdiction, required);
    }

    function setAssetRule(uint32 version, bytes32 assetType, bool required) external onlyRole(TRAVEL_ADMIN) {
        require(configs[version].exists, "config missing");
        assetRequired[version][assetType] = required;
        emit AssetRuleSet(version, assetType, required);
    }

    function activeConfig() external view returns (Config memory) {
        return configs[activeVersion];
    }

    function configOf(uint32 version) external view returns (Config memory) {
        return configs[version];
    }

    function activeConfigVersion() external view returns (uint32) {
        return activeVersion;
    }

    function jurisdictionRule(uint32 version, bytes32 jurisdiction) external view returns (bool) {
        return jurisdictionRequired[version][jurisdiction];
    }

    function assetRule(uint32 version, bytes32 assetType) external view returns (bool) {
        return assetRequired[version][assetType];
    }
}
