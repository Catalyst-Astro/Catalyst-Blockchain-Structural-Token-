// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITokenUsePolicy {
    function paymentRestricted() external view returns (bool);
    function whitelistRequired() external view returns (bool);
    function disclosuresRequired() external view returns (bool);
    function jurisdictionRequired() external view returns (bool);
    function lockupRequired() external view returns (bool);
    function isPurposeAllowed(bytes32 purposeHash) external view returns (bool);
    function isJurisdictionAllowed(address wallet) external view returns (bool);
    function lockupUntil(address wallet) external view returns (uint64);
}
