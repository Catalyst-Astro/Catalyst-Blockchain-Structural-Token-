// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RoleAuthority.sol";

/// @title CredentialRegistry
/// @notice Manages time-bound credentials for roles (notary, auditor, oracle, compliance).
contract CredentialRegistry {
    enum CredentialStatus {
        ACTIVE,
        EXPIRED,
        REVOKED
    }

    struct Credential {
        bytes32 credentialHash;
        uint64 validFrom;
        uint64 validTo;
        CredentialStatus status;
        bytes32 role;
        address issuer;
        bytes32 revocationReason;
        uint64 updatedAt;
    }

    RoleAuthority public roleAuthority;

    mapping(address => mapping(bytes32 => Credential)) private credentials;

    event RoleAuthorityUpdated(address indexed roleAuthority);
    event CredentialIssued(
        address indexed wallet,
        bytes32 indexed role,
        bytes32 credentialHash,
        uint64 validFrom,
        uint64 validTo,
        address indexed issuer
    );
    event CredentialRotated(
        address indexed wallet,
        bytes32 indexed role,
        bytes32 previousHash,
        bytes32 newHash,
        uint64 validFrom,
        uint64 validTo,
        address indexed issuer
    );
    event CredentialRevoked(address indexed wallet, bytes32 indexed role, bytes32 reasonHash, address indexed issuer);

    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 private constant COMPLIANCE_ADMIN_ROLE = keccak256("COMPLIANCE_ADMIN");
    bytes32 private constant DAO_COUNCIL_ROLE = keccak256("DAO_COUNCIL");

    modifier onlyComplianceAdmin() {
        require(roleAuthority.hasRole(COMPLIANCE_ADMIN_ROLE, msg.sender), "not compliance admin");
        _;
    }

    modifier onlyAuthorityAdmin() {
        require(roleAuthority.hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not authority admin");
        _;
    }

    modifier onlyComplianceOrCouncil() {
        require(
            roleAuthority.hasRole(COMPLIANCE_ADMIN_ROLE, msg.sender)
                || roleAuthority.hasRole(DAO_COUNCIL_ROLE, msg.sender),
            "not authorized"
        );
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

    function issueCredential(
        address wallet,
        bytes32 role,
        bytes32 credentialHash,
        uint64 validFrom,
        uint64 validTo
    ) external onlyComplianceAdmin {
        _writeCredential(wallet, role, credentialHash, validFrom, validTo);
    }

    function revokeCredential(address wallet, bytes32 role, bytes32 reasonHash) external onlyComplianceOrCouncil {
        require(wallet != address(0), "wallet required");
        require(role != bytes32(0), "role required");
        require(reasonHash != bytes32(0), "reason hash required");

        Credential storage cred = credentials[wallet][role];
        require(cred.credentialHash != bytes32(0), "credential missing");
        cred.status = CredentialStatus.REVOKED;
        cred.revocationReason = reasonHash;
        cred.updatedAt = uint64(block.timestamp);

        emit CredentialRevoked(wallet, role, reasonHash, msg.sender);
    }

    function rotateCredential(
        address wallet,
        bytes32 role,
        bytes32 newCredentialHash,
        uint64 validFrom,
        uint64 validTo
    ) external onlyComplianceAdmin {
        _writeCredential(wallet, role, newCredentialHash, validFrom, validTo);
    }

    function _writeCredential(
        address wallet,
        bytes32 role,
        bytes32 credentialHash,
        uint64 validFrom,
        uint64 validTo
    ) internal {
        require(wallet != address(0), "wallet required");
        require(role != bytes32(0), "role required");
        require(credentialHash != bytes32(0), "credential hash required");

        uint64 start = validFrom == 0 ? uint64(block.timestamp) : validFrom;
        require(validTo > start, "invalid validity window");

        Credential storage cred = credentials[wallet][role];
        bytes32 previousHash = cred.credentialHash;

        cred.credentialHash = credentialHash;
        cred.validFrom = start;
        cred.validTo = validTo;
        cred.status = CredentialStatus.ACTIVE;
        cred.role = role;
        cred.issuer = msg.sender;
        cred.revocationReason = bytes32(0);
        cred.updatedAt = uint64(block.timestamp);

        if (previousHash == bytes32(0)) {
            emit CredentialIssued(wallet, role, credentialHash, start, validTo, msg.sender);
        } else {
            emit CredentialRotated(wallet, role, previousHash, credentialHash, start, validTo, msg.sender);
        }
    }

    function credentialOf(address wallet, bytes32 role) external view returns (Credential memory) {
        return credentials[wallet][role];
    }

    function statusOf(address wallet, bytes32 role) public view returns (CredentialStatus) {
        Credential memory cred = credentials[wallet][role];
        if (cred.credentialHash == bytes32(0)) {
            return CredentialStatus.EXPIRED;
        }
        if (cred.status == CredentialStatus.REVOKED) {
            return CredentialStatus.REVOKED;
        }
        if (block.timestamp > cred.validTo) {
            return CredentialStatus.EXPIRED;
        }
        return cred.status;
    }

    function isCredentialActive(address wallet, bytes32 role) external view returns (bool) {
        Credential memory cred = credentials[wallet][role];
        if (cred.credentialHash == bytes32(0)) {
            return false;
        }
        if (cred.status != CredentialStatus.ACTIVE) {
            return false;
        }
        if (block.timestamp < cred.validFrom) {
            return false;
        }
        if (block.timestamp > cred.validTo) {
            return false;
        }
        return true;
    }
}
