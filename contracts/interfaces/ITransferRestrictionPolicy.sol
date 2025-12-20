// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITransferRestrictionPolicy {
    function enforcementEnabled() external view returns (bool);
    function eligibilityRequired() external view returns (bool);
    function jurisdictionRequired() external view returns (bool);
    function lockupUntil(address wallet) external view returns (uint64);
}
