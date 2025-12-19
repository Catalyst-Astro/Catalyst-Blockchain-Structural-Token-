// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title TokenUsePolicy
/// @notice Policy flags and controls for compliant token usage.
contract TokenUsePolicy is AccessControl {
    bytes32 public constant DAO_COUNCIL_ROLE = keccak256("DAO_COUNCIL");

    struct PolicyState {
        bool paymentRestricted;
        bool whitelistRequired;
        bool disclosuresRequired;
        bool jurisdictionRequired;
        bool lockupRequired;
        bytes32 policyHash;
        uint64 updatedAt;
    }

    uint256 public policyVersion;
    PolicyState private policy;

    mapping(bytes32 => bool) public allowedPurpose;
    mapping(bytes32 => bool) public allowedJurisdictions;
    mapping(address => bytes32) public walletJurisdiction;
    mapping(address => uint64) public lockupUntil;

    event PolicyUpdated(
        uint256 indexed version,
        bytes32 indexed policyHash,
        bool paymentRestricted,
        bool whitelistRequired,
        bool disclosuresRequired,
        bool jurisdictionRequired,
        bool lockupRequired
    );
    event PurposeAllowed(bytes32 indexed purposeHash, bool allowed);
    event JurisdictionAllowed(bytes32 indexed jurisdiction, bool allowed);
    event WalletJurisdictionUpdated(address indexed wallet, bytes32 indexed jurisdiction);
    event LockupUpdated(address indexed wallet, uint64 until);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DAO_COUNCIL_ROLE, admin);
        _setRoleAdmin(DAO_COUNCIL_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /// @notice Update policy flags and store an off-chain policy hash.
    function updatePolicy(
        bool paymentRestrictedFlag,
        bool whitelistRequiredFlag,
        bool disclosuresRequiredFlag,
        bool jurisdictionRequiredFlag,
        bool lockupRequiredFlag,
        bytes32 policyHash_
    ) external onlyRole(DAO_COUNCIL_ROLE) {
        policyVersion += 1;
        policy = PolicyState({
            paymentRestricted: paymentRestrictedFlag,
            whitelistRequired: whitelistRequiredFlag,
            disclosuresRequired: disclosuresRequiredFlag,
            jurisdictionRequired: jurisdictionRequiredFlag,
            lockupRequired: lockupRequiredFlag,
            policyHash: policyHash_,
            updatedAt: uint64(block.timestamp)
        });
        emit PolicyUpdated(
            policyVersion,
            policyHash_,
            paymentRestrictedFlag,
            whitelistRequiredFlag,
            disclosuresRequiredFlag,
            jurisdictionRequiredFlag,
            lockupRequiredFlag
        );
    }

    function paymentRestricted() external view returns (bool) {
        return policy.paymentRestricted;
    }

    function whitelistRequired() external view returns (bool) {
        return policy.whitelistRequired;
    }

    function disclosuresRequired() external view returns (bool) {
        return policy.disclosuresRequired;
    }

    function jurisdictionRequired() external view returns (bool) {
        return policy.jurisdictionRequired;
    }

    function lockupRequired() external view returns (bool) {
        return policy.lockupRequired;
    }

    function policyHash() external view returns (bytes32) {
        return policy.policyHash;
    }

    function setAllowedPurpose(bytes32 purposeHash, bool allowed) external onlyRole(DAO_COUNCIL_ROLE) {
        require(purposeHash != bytes32(0), "purpose required");
        allowedPurpose[purposeHash] = allowed;
        emit PurposeAllowed(purposeHash, allowed);
    }

    function setAllowedJurisdiction(bytes32 jurisdiction, bool allowed) external onlyRole(DAO_COUNCIL_ROLE) {
        require(jurisdiction != bytes32(0), "jurisdiction required");
        allowedJurisdictions[jurisdiction] = allowed;
        emit JurisdictionAllowed(jurisdiction, allowed);
    }

    function setWalletJurisdiction(address wallet, bytes32 jurisdiction) external onlyRole(DAO_COUNCIL_ROLE) {
        require(wallet != address(0), "wallet required");
        walletJurisdiction[wallet] = jurisdiction;
        emit WalletJurisdictionUpdated(wallet, jurisdiction);
    }

    function setLockup(address wallet, uint64 until) external onlyRole(DAO_COUNCIL_ROLE) {
        require(wallet != address(0), "wallet required");
        lockupUntil[wallet] = until;
        emit LockupUpdated(wallet, until);
    }

    function isPurposeAllowed(bytes32 purposeHash) external view returns (bool) {
        return allowedPurpose[purposeHash];
    }

    function isJurisdictionAllowed(address wallet) external view returns (bool) {
        bytes32 jurisdiction = walletJurisdiction[wallet];
        if (jurisdiction == bytes32(0)) {
            return false;
        }
        return allowedJurisdictions[jurisdiction];
    }
}
