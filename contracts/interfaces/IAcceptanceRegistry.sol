// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAcceptanceRegistry {
    function hasAccepted(address wallet, uint256 versionId) external view returns (bool);
}
