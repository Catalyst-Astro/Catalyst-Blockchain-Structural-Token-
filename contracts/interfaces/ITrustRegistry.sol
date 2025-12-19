// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITrustRegistry {
    function trustExists(bytes32 trustId) external view returns (bool);
}
