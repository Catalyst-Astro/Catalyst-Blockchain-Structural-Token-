// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ProposalStruct.sol";
import "./VotingPower.sol";
import "./modifiers/OnlyTokenHolder.sol";

/// @title FractalDAO Governance Contract
/// @notice DAO for FRT holders with snapshot based voting.
/// @dev Designed with legal-audit friendly comments.
contract FractalDAO is Ownable, OnlyTokenHolder {
    using VotingPower for IFractalToken;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;

    event ProposalCreated(uint256 indexed id, address indexed creator, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalFinalized(uint256 indexed id, bool accepted);

    constructor(IFractalToken _token, uint256 _minHolding) OnlyTokenHolder(_token, _minHolding) {}

    /// @notice Create a new proposal. Only accessible to qualified token holders.
    function createProposal(string calldata title, string calldata description, bytes calldata executionScript, uint64 duration) external onlyTokenHolder returns (uint256) {
        require(duration > 0, "invalid duration");

        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.title = title;
        p.description = description;
        p.proposalHash = keccak256(executionScript);
        p.createdBy = msg.sender;
        p.startTime = uint64(block.timestamp);
        p.endTime = uint64(block.timestamp + duration);
        p.executionScript = executionScript;
        p.snapshotId = token.snapshot();

        emit ProposalCreated(id, msg.sender, title);
        return id;
    }

    /// @notice Cast a vote on an active proposal.
    /// @param proposalId Identifier of the proposal.
    /// @param support True for yes, false for no.
    function vote(uint256 proposalId, bool support) external onlyTokenHolder {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.startTime && block.timestamp <= p.endTime, "voting closed");
        require(!p.hasVoted[msg.sender], "already voted");

        uint256 weight = token.balanceOfAt(msg.sender, p.snapshotId);
        require(weight > 0, "no weight");
        p.hasVoted[msg.sender] = true;

        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /// @notice Finalize a proposal after its voting period.
    function finalizeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp > p.endTime, "still active");
        require(!p.executed, "finalized");

        p.executed = true;
        bool accepted = p.forVotes > p.againstVotes;
        if (accepted) {
            // execute encoded actions
            (bool success, ) = address(this).call(p.executionScript);
            require(success, "exec failed");
        }

        emit ProposalFinalized(proposalId, accepted);
    }

    /// @notice View details of a proposal without sensitive mappings.
    function getProposal(uint256 proposalId) external view returns (string memory, string memory, bytes32, address, uint64, uint64, bytes memory, uint256, uint256, bool) {
        Proposal storage p = proposals[proposalId];
        return (p.title, p.description, p.proposalHash, p.createdBy, p.startTime, p.endTime, p.executionScript, p.forVotes, p.againstVotes, p.executed);
    }
}
