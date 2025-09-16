// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReputationAware
 * @dev Interface for contracts that expose reputation related data.
 */
interface IReputationAware {
    function getReputationScore(address user) external view returns (uint256);
    function getDelegatedVotes(address account) external view returns (uint256);
    function getDelegators(address account) external view returns (address[] memory);
}
