// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title LockupRegistry
/// @notice Tracks lockups by series and wallet for transfer restrictions.
contract LockupRegistry is AccessControl {
    bytes32 public constant SERIES_ADMIN = keccak256("SERIES_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    mapping(bytes32 => uint64) private seriesLockup;
    mapping(address => mapping(bytes32 => uint64)) private walletLockup;

    event SeriesLockupSet(bytes32 indexed seriesId, uint64 lockupEnd);
    event WalletLockupSet(address indexed wallet, bytes32 indexed seriesId, uint64 lockupEnd);

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

    function setSeriesLockup(bytes32 seriesId, uint64 lockupEnd) external onlyRole(SERIES_ADMIN) {
        require(seriesId != bytes32(0), "series id required");
        seriesLockup[seriesId] = lockupEnd;
        emit SeriesLockupSet(seriesId, lockupEnd);
    }

    function setWalletLockup(address wallet, bytes32 seriesId, uint64 lockupEnd)
        external
        onlyRole(COMPLIANCE_ADMIN)
    {
        require(wallet != address(0), "wallet required");
        require(seriesId != bytes32(0), "series id required");
        walletLockup[wallet][seriesId] = lockupEnd;
        emit WalletLockupSet(wallet, seriesId, lockupEnd);
    }

    function isLocked(address wallet, bytes32 seriesId) external view returns (bool) {
        if (wallet == address(0) || seriesId == bytes32(0)) {
            return false;
        }
        uint64 walletEnd = walletLockup[wallet][seriesId];
        if (walletEnd != 0 && block.timestamp < walletEnd) {
            return true;
        }
        uint64 seriesEnd = seriesLockup[seriesId];
        return seriesEnd != 0 && block.timestamp < seriesEnd;
    }

    function lockupEndOfSeries(bytes32 seriesId) external view returns (uint64) {
        return seriesLockup[seriesId];
    }

    function lockupEndOfWallet(address wallet, bytes32 seriesId) external view returns (uint64) {
        return walletLockup[wallet][seriesId];
    }
}
