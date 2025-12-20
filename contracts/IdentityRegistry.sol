// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title IdentityRegistry
/// @notice Stores verified identity hashes and AML status without PII.
contract IdentityRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant ORACLE_OPERATOR = keccak256("ORACLE_OPERATOR");

    enum UserType {
        INDIVIDUAL,
        ENTITY,
        INSTITUTIONAL
    }

    enum AMLStatus {
        PENDING,
        VERIFIED,
        SUSPENDED
    }

    struct IdentityProfile {
        bytes32 identityHash;
        UserType userType;
        AMLStatus status;
        uint64 updatedAt;
    }

    mapping(address => IdentityProfile) private profiles;

    event IdentityVerified(address indexed wallet, bytes32 indexed identityHash, UserType userType);
    event IdentityUpdated(address indexed wallet, bytes32 indexed identityHash, AMLStatus status);
    event IdentitySuspended(address indexed wallet);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);
        _setRoleAdmin(LEGAL_AUDITOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(ORACLE_OPERATOR, COMPLIANCE_ADMIN);
    }

    function verifyIdentity(address wallet, bytes32 identityHash, UserType userType)
        external
        onlyRole(COMPLIANCE_ADMIN)
    {
        require(wallet != address(0), "wallet required");
        require(identityHash != bytes32(0), "identity hash required");
        profiles[wallet] = IdentityProfile({
            identityHash: identityHash,
            userType: userType,
            status: AMLStatus.VERIFIED,
            updatedAt: uint64(block.timestamp)
        });
        emit IdentityVerified(wallet, identityHash, userType);
    }

    function updateIdentity(address wallet, bytes32 identityHash, AMLStatus status)
        external
        onlyRole(COMPLIANCE_ADMIN)
    {
        require(wallet != address(0), "wallet required");
        require(identityHash != bytes32(0), "identity hash required");
        profiles[wallet].identityHash = identityHash;
        profiles[wallet].status = status;
        profiles[wallet].updatedAt = uint64(block.timestamp);
        emit IdentityUpdated(wallet, identityHash, status);
    }

    function suspendIdentity(address wallet) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        profiles[wallet].status = AMLStatus.SUSPENDED;
        profiles[wallet].updatedAt = uint64(block.timestamp);
        emit IdentitySuspended(wallet);
    }

    function getProfile(address wallet) external view returns (IdentityProfile memory) {
        return profiles[wallet];
    }

    function statusOf(address wallet) external view returns (AMLStatus) {
        return profiles[wallet].status;
    }

    function isVerified(address wallet) external view returns (bool) {
        return profiles[wallet].status == AMLStatus.VERIFIED;
    }
}
