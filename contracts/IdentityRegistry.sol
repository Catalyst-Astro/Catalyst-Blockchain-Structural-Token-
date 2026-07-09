// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RoleAuthority.sol";

/// @title IdentityRegistry
/// @notice Stores verified identity hashes without PII and tracks lifecycle status.
contract IdentityRegistry {
    enum Status {
        UNVERIFIED,
        VERIFIED,
        SUSPENDED,
        REVOKED
    }

    struct IdentityRecord {
        bytes32 identityHash;
        Status status;
        uint64 updatedAt;
        address issuer;
        bytes32 reasonHash; // suspension or revocation reason hash
    }

    RoleAuthority public roleAuthority;

    mapping(address => IdentityRecord) private identities;

    event RoleAuthorityUpdated(address indexed roleAuthority);
    event IdentityVerified(address indexed wallet, bytes32 indexed identityHash, address indexed issuer);
    event IdentityUpdated(
        address indexed wallet,
        bytes32 indexed identityHash,
        Status status,
        address indexed issuer
    );
    event IdentitySuspended(address indexed wallet, bytes32 reasonHash, address indexed issuer);
    event IdentityRevoked(address indexed wallet, bytes32 reasonHash, address indexed issuer);

    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 private constant COMPLIANCE_ADMIN_ROLE = keccak256("COMPLIANCE_ADMIN");
    bytes32 private constant NOTARY_ROLE = keccak256("NOTARY");

    modifier onlyComplianceAdmin() {
        require(roleAuthority.hasRole(COMPLIANCE_ADMIN_ROLE, msg.sender), "not compliance admin");
        _;
    }

    modifier onlyVerifier() {
        require(
            roleAuthority.hasRole(COMPLIANCE_ADMIN_ROLE, msg.sender)
                || roleAuthority.hasRole(NOTARY_ROLE, msg.sender),
            "not authorized"
        );
        _;
    }

    modifier onlyAuthorityAdmin() {
        require(roleAuthority.hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not authority admin");
        _;
    }

    constructor(RoleAuthority roleAuthority_) {
        require(address(roleAuthority_) != address(0), "role authority required");
        roleAuthority = roleAuthority_;
    }

    function setRoleAuthority(RoleAuthority roleAuthority_) external onlyAuthorityAdmin {
        require(address(roleAuthority_) != address(0), "role authority required");
        roleAuthority = roleAuthority_;
        emit RoleAuthorityUpdated(address(roleAuthority_));
    }

    function verifyIdentity(address wallet, bytes32 identityHash) external onlyVerifier {
        require(wallet != address(0), "wallet required");
        require(identityHash != bytes32(0), "identity hash required");

        IdentityRecord storage record = identities[wallet];
        record.identityHash = identityHash;
        record.status = Status.VERIFIED;
        record.updatedAt = uint64(block.timestamp);
        record.issuer = msg.sender;
        record.reasonHash = bytes32(0);

        emit IdentityVerified(wallet, identityHash, msg.sender);
    }

    function updateIdentity(address wallet, bytes32 identityHash, Status newStatus)
        external
        onlyComplianceAdmin
    {
        require(wallet != address(0), "wallet required");
        require(identityHash != bytes32(0), "identity hash required");
        require(newStatus != Status.REVOKED, "use revokeIdentity");

        IdentityRecord storage record = identities[wallet];
        record.identityHash = identityHash;
        record.status = newStatus;
        record.updatedAt = uint64(block.timestamp);
        record.issuer = msg.sender;
        record.reasonHash = bytes32(0);

        emit IdentityUpdated(wallet, identityHash, newStatus, msg.sender);
    }

    function suspendIdentity(address wallet, bytes32 reasonHash) external onlyComplianceAdmin {
        require(wallet != address(0), "wallet required");
        require(reasonHash != bytes32(0), "reason hash required");

        IdentityRecord storage record = identities[wallet];
        record.status = Status.SUSPENDED;
        record.updatedAt = uint64(block.timestamp);
        record.issuer = msg.sender;
        record.reasonHash = reasonHash;

        emit IdentitySuspended(wallet, reasonHash, msg.sender);
    }

    function revokeIdentity(address wallet, bytes32 reasonHash) external onlyComplianceAdmin {
        require(wallet != address(0), "wallet required");
        require(reasonHash != bytes32(0), "reason hash required");

        IdentityRecord storage record = identities[wallet];
        record.status = Status.REVOKED;
        record.updatedAt = uint64(block.timestamp);
        record.issuer = msg.sender;
        record.reasonHash = reasonHash;

        emit IdentityRevoked(wallet, reasonHash, msg.sender);
    }

    function getIdentity(address wallet) external view returns (IdentityRecord memory) {
        return identities[wallet];
    }

    function statusOf(address wallet) external view returns (Status) {
        return identities[wallet].status;
    }

    function isVerified(address wallet) external view returns (bool) {
        IdentityRecord memory record = identities[wallet];
        return wallet != address(0) && record.status == Status.VERIFIED;
    }
}
