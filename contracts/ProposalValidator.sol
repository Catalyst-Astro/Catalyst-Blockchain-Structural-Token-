// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProposalValidator
/// @notice Flags proposals that require extra council approval.
contract ProposalValidator {
    mapping(uint256 => bool) public sensitiveProposals;

    event ProposalMarkedSensitive(uint256 indexed proposalId, bool sensitive);

    function setSensitive(uint256 proposalId, bool sensitive) external {
        sensitiveProposals[proposalId] = sensitive;
        emit ProposalMarkedSensitive(proposalId, sensitive);
    }

    function isSensitive(uint256 proposalId) external view returns (bool) {
        return sensitiveProposals[proposalId];
    }
}
