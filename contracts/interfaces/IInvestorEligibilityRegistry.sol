// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInvestorEligibilityRegistry {
    function isEligible(address investor) external view returns (bool);
    function jurisdictionOf(address investor) external view returns (bytes32);
}
