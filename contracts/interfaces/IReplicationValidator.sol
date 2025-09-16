// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "../TerritoryStructs.sol";

interface IReplicationValidator {
    function validateReplication(
        uint256 territoryId,
        TerritoryStructs.ValidationDocs calldata docs
    ) external view returns (bool);
}

