// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEntityRegistry {
    function entityOf(address wallet) external view returns (bytes32);
}
