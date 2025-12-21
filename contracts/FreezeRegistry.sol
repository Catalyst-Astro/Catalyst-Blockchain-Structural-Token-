// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./FreezePolicyRegistry.sol";
import "./EmergencyMode.sol";
import "./interfaces/IFreezeRegistry.sol";

/// @title FreezeRegistry
/// @notice Granular freeze registry for wallets, series, and functions.
contract FreezeRegistry is AccessControl, IFreezeRegistry {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant ORACLE_OPERATOR = keccak256("ORACLE_OPERATOR");
    bytes32 public constant FIDUCIARY_LIAISON = keccak256("FIDUCIARY_LIAISON");

    enum Status {
        ACTIVE,
        REVIEW,
        RELEASED
    }

    struct FreezeRecord {
        uint8 freezeTypeCode;
        bytes32 caseId;
        bytes32 justificationHash;
        uint64 activatedAt;
        address activatedBy;
        Status status;
        bytes32 resolutionHash;
        uint64 releasedAt;
        uint64 expiresAt;
    }

    FreezePolicyRegistry public policyRegistry;
    EmergencyMode public emergencyMode;

    mapping(address => FreezeRecord) private walletFreezes;
    mapping(bytes32 => FreezeRecord) private seriesFreezes;
    mapping(bytes4 => FreezeRecord) private functionFreezes;

    event WalletFrozen(address indexed wallet, bytes32 caseId, bytes32 justificationHash, uint8 freezeTypeCode);
    event SeriesFrozen(bytes32 indexed seriesId, bytes32 caseId, bytes32 justificationHash, uint8 freezeTypeCode);
    event FunctionFrozen(bytes4 indexed selector, bytes32 caseId, bytes32 justificationHash, uint8 freezeTypeCode);
    event WalletUnfrozen(address indexed wallet, bytes32 resolutionHash);
    event SeriesUnfrozen(bytes32 indexed seriesId, bytes32 resolutionHash);
    event FunctionUnfrozen(bytes4 indexed selector, bytes32 resolutionHash);
    event FreezeStatusUpdated(bytes32 indexed targetId, Status status);
    event PolicyRegistrySet(address indexed registry);
    event EmergencyModeSet(address indexed emergencyMode);

    constructor(address admin, address policyRegistry_, address emergencyMode_) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(ORACLE_OPERATOR, admin);
        _grantRole(FIDUCIARY_LIAISON, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ORACLE_OPERATOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(FIDUCIARY_LIAISON, COMPLIANCE_ADMIN);

        policyRegistry = FreezePolicyRegistry(policyRegistry_);
        emergencyMode = EmergencyMode(emergencyMode_);
        emit PolicyRegistrySet(policyRegistry_);
        emit EmergencyModeSet(emergencyMode_);
    }

    function setPolicyRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        policyRegistry = FreezePolicyRegistry(registry);
        emit PolicyRegistrySet(registry);
    }

    function setEmergencyMode(address emergencyMode_) external onlyRole(COMPLIANCE_ADMIN) {
        emergencyMode = EmergencyMode(emergencyMode_);
        emit EmergencyModeSet(emergencyMode_);
    }

    function freezeWallet(address wallet, bytes32 caseId, bytes32 justificationHash, uint8 freezeTypeCode) external {
        require(wallet != address(0), "wallet required");
        _requireFreezeAllowed(freezeTypeCode);
        FreezeRecord storage record = walletFreezes[wallet];
        _setFreezeRecord(record, caseId, justificationHash, freezeTypeCode);
        emit WalletFrozen(wallet, caseId, justificationHash, freezeTypeCode);
    }

    function freezeSeries(bytes32 seriesId, bytes32 caseId, bytes32 justificationHash, uint8 freezeTypeCode) external {
        require(seriesId != bytes32(0), "series id required");
        _requireFreezeAllowed(freezeTypeCode);
        FreezeRecord storage record = seriesFreezes[seriesId];
        _setFreezeRecord(record, caseId, justificationHash, freezeTypeCode);
        emit SeriesFrozen(seriesId, caseId, justificationHash, freezeTypeCode);
    }

    function freezeFunction(bytes4 selector, bytes32 caseId, bytes32 justificationHash, uint8 freezeTypeCode)
        external
    {
        require(selector != bytes4(0), "selector required");
        _requireFreezeAllowed(freezeTypeCode);
        FreezeRecord storage record = functionFreezes[selector];
        _setFreezeRecord(record, caseId, justificationHash, freezeTypeCode);
        emit FunctionFrozen(selector, caseId, justificationHash, freezeTypeCode);
    }

    function unfreezeWallet(address wallet, bytes32 resolutionHash) external {
        _requireUnfreezeAllowed(walletFreezes[wallet].freezeTypeCode);
        _releaseFreeze(walletFreezes[wallet], resolutionHash);
        emit WalletUnfrozen(wallet, resolutionHash);
    }

    function unfreezeSeries(bytes32 seriesId, bytes32 resolutionHash) external {
        _requireUnfreezeAllowed(seriesFreezes[seriesId].freezeTypeCode);
        _releaseFreeze(seriesFreezes[seriesId], resolutionHash);
        emit SeriesUnfrozen(seriesId, resolutionHash);
    }

    function unfreezeFunction(bytes4 selector, bytes32 resolutionHash) external {
        _requireUnfreezeAllowed(functionFreezes[selector].freezeTypeCode);
        _releaseFreeze(functionFreezes[selector], resolutionHash);
        emit FunctionUnfrozen(selector, resolutionHash);
    }

    function setWalletStatus(address wallet, Status status) external onlyRole(COMPLIANCE_ADMIN) {
        walletFreezes[wallet].status = status;
        emit FreezeStatusUpdated(bytes32(uint256(uint160(wallet))), status);
    }

    function setSeriesStatus(bytes32 seriesId, Status status) external onlyRole(COMPLIANCE_ADMIN) {
        seriesFreezes[seriesId].status = status;
        emit FreezeStatusUpdated(seriesId, status);
    }

    function setFunctionStatus(bytes4 selector, Status status) external onlyRole(COMPLIANCE_ADMIN) {
        functionFreezes[selector].status = status;
        emit FreezeStatusUpdated(bytes32(selector), status);
    }

    function isFrozenWallet(address wallet) external view returns (bool) {
        return _isActive(walletFreezes[wallet]);
    }

    function isFrozenSeries(bytes32 seriesId) external view returns (bool) {
        return _isActive(seriesFreezes[seriesId]);
    }

    function isFrozenFunction(bytes4 selector) external view returns (bool) {
        return _isActive(functionFreezes[selector]);
    }

    function walletFreezeRecord(address wallet) external view returns (FreezeRecord memory) {
        return walletFreezes[wallet];
    }

    function seriesFreezeRecord(bytes32 seriesId) external view returns (FreezeRecord memory) {
        return seriesFreezes[seriesId];
    }

    function functionFreezeRecord(bytes4 selector) external view returns (FreezeRecord memory) {
        return functionFreezes[selector];
    }

    function _requireFreezeAllowed(uint8 freezeTypeCode) internal view {
        require(
            hasRole(COMPLIANCE_ADMIN, msg.sender) ||
                hasRole(DAO_COUNCIL, msg.sender) ||
                hasRole(ORACLE_OPERATOR, msg.sender) ||
                hasRole(FIDUCIARY_LIAISON, msg.sender),
            "not authorized"
        );

        FreezePolicyRegistry.FreezePolicy memory policy = _policyForType(freezeTypeCode);
        require(policy.exists, "policy missing");

        if (policy.emergencyOnly) {
            require(address(emergencyMode) != address(0) && emergencyMode.isEmergencyActive(), "emergency required");
        }
        if (hasRole(ORACLE_OPERATOR, msg.sender)) {
            require(policy.oracleAllowed, "oracle not allowed");
        }
    }

    function _requireUnfreezeAllowed(uint8 freezeTypeCode) internal view {
        FreezePolicyRegistry.FreezePolicy memory policy = _policyForType(freezeTypeCode);
        if (policy.exists && policy.requiresDaoRatification) {
            require(hasRole(DAO_COUNCIL, msg.sender), "dao required");
            return;
        }
        require(hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender), "not authorized");
    }

    function _policyForType(uint8 freezeTypeCode) internal view returns (FreezePolicyRegistry.FreezePolicy memory) {
        if (address(policyRegistry) == address(0)) {
            return FreezePolicyRegistry.FreezePolicy(0, false, false, false, false);
        }
        uint32 version = policyRegistry.activePolicyVersion();
        if (version == 0) {
            return FreezePolicyRegistry.FreezePolicy(0, false, false, false, false);
        }
        return policyRegistry.freezePolicyOf(version, freezeTypeCode);
    }

    function _setFreezeRecord(
        FreezeRecord storage record,
        bytes32 caseId,
        bytes32 justificationHash,
        uint8 freezeTypeCode
    ) internal {
        require(caseId != bytes32(0), "case id required");
        require(justificationHash != bytes32(0), "justification required");
        FreezePolicyRegistry.FreezePolicy memory policy = _policyForType(freezeTypeCode);
        uint64 expiresAt = 0;
        if (policy.maxDurationSeconds > 0) {
            expiresAt = uint64(block.timestamp) + policy.maxDurationSeconds;
        }
        record.freezeTypeCode = freezeTypeCode;
        record.caseId = caseId;
        record.justificationHash = justificationHash;
        record.activatedAt = uint64(block.timestamp);
        record.activatedBy = msg.sender;
        record.status = Status.ACTIVE;
        record.resolutionHash = bytes32(0);
        record.releasedAt = 0;
        record.expiresAt = expiresAt;
    }

    function _releaseFreeze(FreezeRecord storage record, bytes32 resolutionHash) internal {
        require(record.status != Status.RELEASED, "already released");
        record.status = Status.RELEASED;
        record.resolutionHash = resolutionHash;
        record.releasedAt = uint64(block.timestamp);
    }

    function _isActive(FreezeRecord storage record) internal view returns (bool) {
        if (record.status != Status.ACTIVE && record.status != Status.REVIEW) {
            return false;
        }
        if (record.expiresAt != 0 && block.timestamp > record.expiresAt) {
            return false;
        }
        return record.caseId != bytes32(0);
    }
}
