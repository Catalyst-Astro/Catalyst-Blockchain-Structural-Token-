// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IIdentityPolicyRegistry.sol";

/// @title IdentityPolicyRegistry
/// @notice Versioned policies for minimum KYC levels and allowed user types.
contract IdentityPolicyRegistry is AccessControl, IIdentityPolicyRegistry {
    bytes32 public constant IDENTITY_ADMIN = keccak256("IDENTITY_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    mapping(uint32 => Policy) private policies;
    uint32 private activeVersion;
    uint32 private nextVersion;

    event IdentityPolicyPublished(uint32 version, bytes32 policyHash);
    event IdentityPolicyActivated(uint32 version);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(IDENTITY_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(IDENTITY_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, IDENTITY_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishPolicy(
        uint8 minKycForTransfer,
        uint8 minKycForReceive,
        uint8 minKycForClaim,
        uint8 minKycForVote,
        uint256 allowedUserTypesMask,
        bytes32 policyHash
    ) external onlyRole(IDENTITY_ADMIN) returns (uint32 version) {
        version = nextVersion + 1;
        nextVersion = version;
        policies[version] = Policy({
            minKycForTransfer: minKycForTransfer,
            minKycForReceive: minKycForReceive,
            minKycForClaim: minKycForClaim,
            minKycForVote: minKycForVote,
            allowedUserTypesMask: allowedUserTypesMask,
            version: version,
            policyHash: policyHash,
            exists: true
        });
        emit IdentityPolicyPublished(version, policyHash);
    }

    function activatePolicy(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(policies[version].exists, "policy missing");
        activeVersion = version;
        emit IdentityPolicyActivated(version);
    }

    function activePolicy() external view returns (Policy memory) {
        return policies[activeVersion];
    }

    function activePolicyVersion() external view returns (uint32) {
        return activeVersion;
    }

    function policyOf(uint32 version) external view returns (Policy memory) {
        return policies[version];
    }
}
