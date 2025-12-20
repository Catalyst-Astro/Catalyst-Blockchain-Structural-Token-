// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITravelRuleGate {
    function requiresTravelRule(address from, address to, uint256 amount, bytes32 assetType) external view returns (bool);

    function enforceTravelRule(
        address from,
        address to,
        uint256 amount,
        bytes32 assetType,
        bytes32 evidenceId
    ) external view;
}
