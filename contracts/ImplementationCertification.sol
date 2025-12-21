// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/ICatalystStandardRegistry.sol";

/// @title ImplementationCertification
/// @notice Certifies Catalyst-compatible implementations with audit evidence hashes.
contract ImplementationCertification is AccessControl {
    bytes32 public constant CERTIFIER_ROLE = keccak256("CERTIFIER_ROLE");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    enum Status {
        NONE,
        CERTIFIED,
        REVOKED
    }

    struct Certification {
        uint32 standardVersion;
        bytes32 auditHash;
        bytes32 reasonHash;
        uint64 validFrom;
        uint64 validTo;
        Status status;
        bool exists;
    }

    ICatalystStandardRegistry public standardRegistry;
    mapping(bytes32 => Certification) private certifications;

    event CertificationIssued(bytes32 indexed implementationId, uint32 standardVersion, bytes32 auditHash, uint64 validTo);
    event CertificationRevoked(bytes32 indexed implementationId, bytes32 reasonHash);
    event StandardRegistrySet(address indexed registry);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CERTIFIER_ROLE, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(CERTIFIER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function setStandardRegistry(address registry) external onlyRole(CERTIFIER_ROLE) {
        standardRegistry = ICatalystStandardRegistry(registry);
        emit StandardRegistrySet(registry);
    }

    function certifyImplementation(
        bytes32 implementationId,
        uint32 standardVersion,
        bytes32 auditHash,
        uint64 validTo
    ) external onlyRole(CERTIFIER_ROLE) {
        require(implementationId != bytes32(0), "implementation id required");
        require(auditHash != bytes32(0), "audit hash required");
        if (address(standardRegistry) != address(0)) {
            require(standardRegistry.isStandardActive(standardVersion), "standard not active");
        }
        certifications[implementationId] = Certification({
            standardVersion: standardVersion,
            auditHash: auditHash,
            reasonHash: bytes32(0),
            validFrom: uint64(block.timestamp),
            validTo: validTo,
            status: Status.CERTIFIED,
            exists: true
        });
        emit CertificationIssued(implementationId, standardVersion, auditHash, validTo);
    }

    function revokeCertification(bytes32 implementationId, bytes32 reasonHash) external onlyRole(DAO_COUNCIL) {
        Certification storage record = certifications[implementationId];
        require(record.exists, "certification missing");
        record.status = Status.REVOKED;
        record.reasonHash = reasonHash;
        emit CertificationRevoked(implementationId, reasonHash);
    }

    function certificationOf(bytes32 implementationId) external view returns (Certification memory) {
        return certifications[implementationId];
    }

    function isCertified(bytes32 implementationId) external view returns (bool) {
        Certification memory record = certifications[implementationId];
        if (!record.exists || record.status != Status.CERTIFIED) {
            return false;
        }
        if (record.validTo == 0) {
            return true;
        }
        return block.timestamp <= record.validTo;
    }
}
