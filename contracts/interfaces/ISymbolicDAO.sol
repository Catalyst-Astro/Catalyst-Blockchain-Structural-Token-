// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../storage/OntologyRegistry.sol";

/// @title ISymbolicDAO
/// @notice Minimal interface for DAO interaction with symbolic ontology modules.
interface ISymbolicDAO {
    function vote(uint256 proposalId, bool support, uint256 weight) external;
    function voteWeight(address voter) external view returns (uint256);
    function requiredArchetype(uint256 proposalId) external view returns (OntologyRegistry.GovernanceArchetype);
}
