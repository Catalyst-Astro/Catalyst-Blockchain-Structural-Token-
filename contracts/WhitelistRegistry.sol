// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IWhitelistRegistry.sol";

/// @title WhitelistRegistry
/// @notice Stores whitelist statuses without PII and emits audit-friendly events.
contract WhitelistRegistry is AccessControl, IWhitelistRegistry {
    bytes32 public constant WHITELIST_ADMIN = keccak256("WHITELIST_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    enum Status {
        NONE,
        APPROVED,
        SUSPENDED,
        REVOKED
    }

    struct Record {
        Status status;
        uint64 activatedAt;
        uint64 updatedAt;
        bytes32 reasonHash;
        uint32 policyVersion;
    }

    mapping(address => Record) private records;

    event WalletApproved(address indexed wallet, uint32 policyVersion, uint64 timestamp);
    event WalletSuspended(address indexed wallet, bytes32 reasonHash, uint64 timestamp);
    event WalletRevoked(address indexed wallet, bytes32 reasonHash, uint64 timestamp);
    event WalletReactivated(address indexed wallet, uint32 policyVersion, uint64 timestamp);

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

    function approveWallet(address wallet, uint32 policyVersion) external onlyRole(WHITELIST_ADMIN) {
        require(wallet != address(0), "wallet required");
        Record storage record = records[wallet];
        record.status = Status.APPROVED;
        record.policyVersion = policyVersion;
        if (record.activatedAt == 0) {
            record.activatedAt = uint64(block.timestamp);
        }
        record.updatedAt = uint64(block.timestamp);
        record.reasonHash = bytes32(0);
        emit WalletApproved(wallet, policyVersion, uint64(block.timestamp));
    }

    function suspendWallet(address wallet, bytes32 reasonHash) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        Record storage record = records[wallet];
        record.status = Status.SUSPENDED;
        record.updatedAt = uint64(block.timestamp);
        record.reasonHash = reasonHash;
        emit WalletSuspended(wallet, reasonHash, uint64(block.timestamp));
    }

    function revokeWallet(address wallet, bytes32 reasonHash) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        Record storage record = records[wallet];
        record.status = Status.REVOKED;
        record.updatedAt = uint64(block.timestamp);
        record.reasonHash = reasonHash;
        emit WalletRevoked(wallet, reasonHash, uint64(block.timestamp));
    }

    function reactivateWallet(address wallet, uint32 policyVersion) external onlyRole(WHITELIST_ADMIN) {
        require(wallet != address(0), "wallet required");
        Record storage record = records[wallet];
        record.status = Status.APPROVED;
        record.policyVersion = policyVersion;
        record.updatedAt = uint64(block.timestamp);
        record.reasonHash = bytes32(0);
        emit WalletReactivated(wallet, policyVersion, uint64(block.timestamp));
    }

    function isWhitelisted(address account) external view returns (bool) {
        return records[account].status == Status.APPROVED;
    }

    function recordOf(address account) external view returns (Record memory) {
        return records[account];
    }
}
