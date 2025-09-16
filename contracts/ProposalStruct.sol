// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Data structure for DAO proposals.
struct Proposal {
    string title;
    string description;
    bytes32 proposalHash;
    address createdBy;
    uint64 startTime;
    uint64 endTime;
    bytes executionScript;
    uint256 snapshotId;
    uint256 forVotes;
    uint256 againstVotes;
    bool executed;
    mapping(address => bool) hasVoted;
}
