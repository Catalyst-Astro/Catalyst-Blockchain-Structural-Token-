// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title SimulationOracle
/// @notice Stores simulation snapshots and activates the current baseline for DAO decisions.
contract SimulationOracle is AccessControl {
    bytes32 public constant SIMULATION_ADMIN = keccak256("SIMULATION_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Snapshot {
        uint256 ssi;
        uint256 bai;
        uint256 priceDecoupleIndex;
        uint256 volatilityIndex;
        uint256 correctionTimeDays;
        bytes32 reportHash;
        uint32 version;
        uint64 timestamp;
        bool exists;
    }

    mapping(uint32 => Snapshot) private snapshots;
    uint32 private activeVersion;
    uint32 private nextVersion;

    event SimulationSnapshotPublished(uint32 version, bytes32 reportHash);
    event SimulationSnapshotActivated(uint32 version);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SIMULATION_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(SIMULATION_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    /// @notice Publish a simulation snapshot. Metrics are scaled by 1e18.
    function publishSnapshot(
        uint256 ssi,
        uint256 bai,
        uint256 priceDecoupleIndex,
        uint256 volatilityIndex,
        uint256 correctionTimeDays,
        bytes32 reportHash
    ) external onlyRole(SIMULATION_ADMIN) returns (uint32 version) {
        require(reportHash != bytes32(0), "report hash required");
        version = nextVersion + 1;
        nextVersion = version;
        snapshots[version] = Snapshot({
            ssi: ssi,
            bai: bai,
            priceDecoupleIndex: priceDecoupleIndex,
            volatilityIndex: volatilityIndex,
            correctionTimeDays: correctionTimeDays,
            reportHash: reportHash,
            version: version,
            timestamp: uint64(block.timestamp),
            exists: true
        });
        emit SimulationSnapshotPublished(version, reportHash);
    }

    /// @notice Activate a snapshot for governance use.
    function activateSnapshot(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(snapshots[version].exists, "snapshot missing");
        activeVersion = version;
        emit SimulationSnapshotActivated(version);
    }

    function activeSnapshot() external view returns (Snapshot memory) {
        return snapshots[activeVersion];
    }

    function snapshotOf(uint32 version) external view returns (Snapshot memory) {
        return snapshots[version];
    }

    function activeSnapshotVersion() external view returns (uint32) {
        return activeVersion;
    }
}
