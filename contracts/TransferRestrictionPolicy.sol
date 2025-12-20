// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title TransferRestrictionPolicy
/// @notice Rules for lockups and eligibility checks in private offerings.
contract TransferRestrictionPolicy is AccessControl {
    bytes32 public constant DAO_COUNCIL_ROLE = keccak256("DAO_COUNCIL_ROLE");

    bool public enforcementEnabled;
    bool public eligibilityRequired;
    bool public jurisdictionRequired;
    uint64 public defaultLockup;
    bytes32 public policyHash;

    mapping(address => uint64) private lockups;

    event PolicyUpdated(
        bool enforcementEnabled,
        bool eligibilityRequired,
        bool jurisdictionRequired,
        uint64 defaultLockup,
        bytes32 policyHash
    );
    event LockupUpdated(address indexed wallet, uint64 until);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DAO_COUNCIL_ROLE, admin);
        _setRoleAdmin(DAO_COUNCIL_ROLE, DEFAULT_ADMIN_ROLE);
    }

    function updatePolicy(
        bool enforcementEnabled_,
        bool eligibilityRequired_,
        bool jurisdictionRequired_,
        uint64 defaultLockup_,
        bytes32 policyHash_
    ) external onlyRole(DAO_COUNCIL_ROLE) {
        enforcementEnabled = enforcementEnabled_;
        eligibilityRequired = eligibilityRequired_;
        jurisdictionRequired = jurisdictionRequired_;
        defaultLockup = defaultLockup_;
        policyHash = policyHash_;
        emit PolicyUpdated(
            enforcementEnabled_,
            eligibilityRequired_,
            jurisdictionRequired_,
            defaultLockup_,
            policyHash_
        );
    }

    function setLockup(address wallet, uint64 until) external onlyRole(DAO_COUNCIL_ROLE) {
        require(wallet != address(0), "wallet required");
        lockups[wallet] = until;
        emit LockupUpdated(wallet, until);
    }

    function lockupUntil(address wallet) external view returns (uint64) {
        return lockups[wallet];
    }
}
