// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TrustRegistry
 * @notice Registry for fideicomiso trusts, assets, and token series with on-chain evidence.
 * @dev Stores only non-sensitive metadata and document hashes.
 */
contract TrustRegistry is AccessControl {
    bytes32 public constant TRUST_ADMIN_ROLE = keccak256("TRUST_ADMIN");
    bytes32 public constant LEGAL_AUDITOR_ROLE = keccak256("LEGAL_AUDITOR");
    bytes32 public constant ORACLE_OPERATOR_ROLE = keccak256("ORACLE_OPERATOR");
    bytes32 public constant DAO_COUNCIL_ROLE = keccak256("DAO_COUNCIL");

    enum TrustStatus {
        NONE,
        ACTIVE,
        SUSPENDED,
        CLOSED
    }

    enum AssetStatus {
        NONE,
        PENDING,
        ACTIVE,
        ENCUMBERED,
        DISPOSED
    }

    enum SeriesStatus {
        NONE,
        ACTIVE,
        PAUSED,
        CLOSED
    }

    struct TrustRecord {
        bytes32 trustId;
        string jurisdiction;
        string fiduciary;
        uint64 effectiveDate;
        uint64 createdAt;
        uint64 updatedAt;
        TrustStatus status;
        bytes32 termsHash;
        bytes32 documentsHash;
    }

    struct AssetRecord {
        bytes32 assetId;
        bytes32 trustId;
        string assetType;
        string locationHint;
        uint64 addedAt;
        AssetStatus status;
        bytes32 deedHash;
        bytes32 appraisalHash;
        bytes32 documentsHash;
    }

    struct TokenSeriesRecord {
        bytes32 seriesId;
        bytes32 trustId;
        string symbol;
        uint64 createdAt;
        SeriesStatus status;
        bytes32 documentsHash;
    }

    mapping(bytes32 => TrustRecord) private trusts;
    mapping(bytes32 => AssetRecord) private assets;
    mapping(bytes32 => TokenSeriesRecord) private series;

    event TrustCreated(
        bytes32 indexed trustId,
        string jurisdiction,
        string fiduciary,
        bytes32 termsHash,
        uint64 effectiveDate,
        TrustStatus status
    );

    event TrustStatusChanged(bytes32 indexed trustId, TrustStatus status);

    event AssetAdded(
        bytes32 indexed assetId,
        bytes32 indexed trustId,
        string assetType,
        string locationHint,
        bytes32 deedHash,
        bytes32 appraisalHash,
        AssetStatus status
    );

    event AssetStatusChanged(bytes32 indexed assetId, AssetStatus status);

    event TokenSeriesRegistered(
        bytes32 indexed seriesId,
        bytes32 indexed trustId,
        string symbol,
        SeriesStatus status,
        bytes32 documentsHash
    );

    event TokenSeriesStatusChanged(bytes32 indexed seriesId, SeriesStatus status);

    event DocumentHashUpdated(
        bytes32 indexed recordId,
        string recordType,
        string docType,
        bytes32 documentHash
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TRUST_ADMIN_ROLE, admin);

        _setRoleAdmin(LEGAL_AUDITOR_ROLE, TRUST_ADMIN_ROLE);
        _setRoleAdmin(ORACLE_OPERATOR_ROLE, TRUST_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL_ROLE, TRUST_ADMIN_ROLE);
    }

    function createTrust(
        bytes32 trustId,
        string calldata jurisdiction,
        string calldata fiduciary,
        bytes32 termsHash,
        uint64 effectiveDate
    ) external onlyRole(TRUST_ADMIN_ROLE) {
        require(trustId != bytes32(0), "trust id required");
        require(trusts[trustId].status == TrustStatus.NONE, "trust exists");

        uint64 timestamp = uint64(block.timestamp);
        TrustRecord memory record = TrustRecord({
            trustId: trustId,
            jurisdiction: jurisdiction,
            fiduciary: fiduciary,
            effectiveDate: effectiveDate,
            createdAt: timestamp,
            updatedAt: timestamp,
            status: TrustStatus.ACTIVE,
            termsHash: termsHash,
            documentsHash: termsHash
        });

        trusts[trustId] = record;

        emit TrustCreated(trustId, jurisdiction, fiduciary, termsHash, effectiveDate, TrustStatus.ACTIVE);
    }

    function updateTrustStatus(bytes32 trustId, TrustStatus newStatus) external {
        _requireAdminOrCouncil();
        TrustRecord storage record = trusts[trustId];
        require(record.status != TrustStatus.NONE, "trust missing");
        record.status = newStatus;
        record.updatedAt = uint64(block.timestamp);
        emit TrustStatusChanged(trustId, newStatus);
    }

    function updateTrustDocumentsHash(
        bytes32 trustId,
        bytes32 newHash,
        string calldata docType
    ) external {
        _requireAdminOrAuditor();
        TrustRecord storage record = trusts[trustId];
        require(record.status != TrustStatus.NONE, "trust missing");
        record.documentsHash = newHash;
        record.updatedAt = uint64(block.timestamp);
        emit DocumentHashUpdated(trustId, "TRUST", docType, newHash);
    }

    function addAsset(
        bytes32 assetId,
        bytes32 trustId,
        string calldata assetType,
        string calldata locationHint,
        bytes32 deedHash,
        bytes32 appraisalHash
    ) external {
        _requireAdminOrOracle();
        require(assetId != bytes32(0), "asset id required");
        require(assets[assetId].status == AssetStatus.NONE, "asset exists");
        require(trusts[trustId].status != TrustStatus.NONE, "trust missing");

        assets[assetId] = AssetRecord({
            assetId: assetId,
            trustId: trustId,
            assetType: assetType,
            locationHint: locationHint,
            addedAt: uint64(block.timestamp),
            status: AssetStatus.PENDING,
            deedHash: deedHash,
            appraisalHash: appraisalHash,
            documentsHash: bytes32(0)
        });

        emit AssetAdded(
            assetId,
            trustId,
            assetType,
            locationHint,
            deedHash,
            appraisalHash,
            AssetStatus.PENDING
        );
    }

    function updateAssetStatus(bytes32 assetId, AssetStatus newStatus) external {
        _requireAdminOrOracle();
        AssetRecord storage record = assets[assetId];
        require(record.status != AssetStatus.NONE, "asset missing");
        record.status = newStatus;
        emit AssetStatusChanged(assetId, newStatus);
    }

    function updateAssetDeedHash(bytes32 assetId, bytes32 newHash) external {
        _requireAdminOrAuditor();
        AssetRecord storage record = assets[assetId];
        require(record.status != AssetStatus.NONE, "asset missing");
        record.deedHash = newHash;
        emit DocumentHashUpdated(assetId, "ASSET", "DEED", newHash);
    }

    function updateAssetAppraisalHash(bytes32 assetId, bytes32 newHash) external {
        _requireAdminOrAuditor();
        AssetRecord storage record = assets[assetId];
        require(record.status != AssetStatus.NONE, "asset missing");
        record.appraisalHash = newHash;
        emit DocumentHashUpdated(assetId, "ASSET", "APPRAISAL", newHash);
    }

    function updateAssetDocumentsHash(
        bytes32 assetId,
        bytes32 newHash,
        string calldata docType
    ) external {
        _requireAdminOrAuditor();
        AssetRecord storage record = assets[assetId];
        require(record.status != AssetStatus.NONE, "asset missing");
        record.documentsHash = newHash;
        emit DocumentHashUpdated(assetId, "ASSET", docType, newHash);
    }

    function registerTokenSeries(
        bytes32 seriesId,
        bytes32 trustId,
        string calldata symbol,
        bytes32 documentsHash
    ) external {
        _requireAdminOrCouncil();
        require(seriesId != bytes32(0), "series id required");
        require(series[seriesId].status == SeriesStatus.NONE, "series exists");
        require(trusts[trustId].status != TrustStatus.NONE, "trust missing");

        series[seriesId] = TokenSeriesRecord({
            seriesId: seriesId,
            trustId: trustId,
            symbol: symbol,
            createdAt: uint64(block.timestamp),
            status: SeriesStatus.ACTIVE,
            documentsHash: documentsHash
        });

        emit TokenSeriesRegistered(seriesId, trustId, symbol, SeriesStatus.ACTIVE, documentsHash);
    }

    function updateSeriesStatus(bytes32 seriesId, SeriesStatus newStatus) external {
        _requireAdminOrCouncil();
        TokenSeriesRecord storage record = series[seriesId];
        require(record.status != SeriesStatus.NONE, "series missing");
        record.status = newStatus;
        emit TokenSeriesStatusChanged(seriesId, newStatus);
    }

    function updateSeriesDocumentsHash(
        bytes32 seriesId,
        bytes32 newHash,
        string calldata docType
    ) external {
        _requireAdminOrAuditor();
        TokenSeriesRecord storage record = series[seriesId];
        require(record.status != SeriesStatus.NONE, "series missing");
        record.documentsHash = newHash;
        emit DocumentHashUpdated(seriesId, "SERIES", docType, newHash);
    }

    function getTrust(bytes32 trustId) external view returns (TrustRecord memory) {
        return trusts[trustId];
    }

    function getAsset(bytes32 assetId) external view returns (AssetRecord memory) {
        return assets[assetId];
    }

    function getSeries(bytes32 seriesId) external view returns (TokenSeriesRecord memory) {
        return series[seriesId];
    }

    function trustExists(bytes32 trustId) external view returns (bool) {
        return trusts[trustId].status != TrustStatus.NONE;
    }

    function _requireAdminOrCouncil() internal view {
        require(
            hasRole(TRUST_ADMIN_ROLE, msg.sender) || hasRole(DAO_COUNCIL_ROLE, msg.sender),
            "missing admin or council role"
        );
    }

    function _requireAdminOrOracle() internal view {
        require(
            hasRole(TRUST_ADMIN_ROLE, msg.sender) || hasRole(ORACLE_OPERATOR_ROLE, msg.sender),
            "missing admin or oracle role"
        );
    }

    function _requireAdminOrAuditor() internal view {
        require(
            hasRole(TRUST_ADMIN_ROLE, msg.sender) || hasRole(LEGAL_AUDITOR_ROLE, msg.sender),
            "missing admin or auditor role"
        );
    }
}
