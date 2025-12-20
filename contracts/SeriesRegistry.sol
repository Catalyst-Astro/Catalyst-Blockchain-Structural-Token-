// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title SeriesRegistry
/// @notice Stores series/project metadata and policy assignments.
contract SeriesRegistry is AccessControl {
    bytes32 public constant SERIES_ADMIN = keccak256("SERIES_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    enum Status {
        ACTIVE,
        PAUSED,
        CLOSED
    }

    struct SeriesInfo {
        bytes32 metadataHash;
        Status status;
        uint32 policyVersion;
        uint64 createdAt;
        uint64 updatedAt;
    }

    mapping(bytes32 => SeriesInfo) private series;

    event SeriesCreated(bytes32 indexed seriesId, bytes32 metadataHash, Status status);
    event SeriesPolicySet(bytes32 indexed seriesId, uint32 policyVersion);
    event SeriesStatusChanged(bytes32 indexed seriesId, Status status);

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

    function createSeries(bytes32 seriesId, bytes32 metadataHash) external onlyRole(SERIES_ADMIN) {
        require(seriesId != bytes32(0), "series id required");
        require(metadataHash != bytes32(0), "metadata hash required");
        require(series[seriesId].createdAt == 0, "series exists");
        series[seriesId] = SeriesInfo({
            metadataHash: metadataHash,
            status: Status.ACTIVE,
            policyVersion: 0,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });
        emit SeriesCreated(seriesId, metadataHash, Status.ACTIVE);
    }

    function setSeriesPolicy(bytes32 seriesId, uint32 policyVersion) external onlyRole(SERIES_ADMIN) {
        SeriesInfo storage info = series[seriesId];
        require(info.createdAt != 0, "series missing");
        info.policyVersion = policyVersion;
        info.updatedAt = uint64(block.timestamp);
        emit SeriesPolicySet(seriesId, policyVersion);
    }

    function setSeriesStatus(bytes32 seriesId, Status status) external onlyRole(SERIES_ADMIN) {
        SeriesInfo storage info = series[seriesId];
        require(info.createdAt != 0, "series missing");
        info.status = status;
        info.updatedAt = uint64(block.timestamp);
        emit SeriesStatusChanged(seriesId, status);
    }

    function seriesInfo(bytes32 seriesId) external view returns (SeriesInfo memory) {
        return series[seriesId];
    }
}
