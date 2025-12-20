// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IRiskScoreRegistry.sol";

interface IRiskPolicyRegistry {
    struct Policy {
        uint256 maxAmountPerPeriod;
        uint32 maxTxPerPeriod;
        uint32 periodSeconds;
        uint256 allowedActions;
        uint32 version;
        bytes32 policyHash;
        bool exists;
    }

    function activePolicy(IRiskScoreRegistry.RiskLevel level) external view returns (Policy memory);

    function activePolicyVersion(IRiskScoreRegistry.RiskLevel level) external view returns (uint32);
}
