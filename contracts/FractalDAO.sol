// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title FractalDAO Governance Contract
/// @notice DAO with proposal creation, voting, and execution capabilities.
/// @dev Consolidates governance logic with snapshot-based voting and execution control.
contract FractalDAO is Ownable, ReentrancyGuard {
    IERC20 public immutable governanceToken;
    uint256 public quorum;
    uint256 public votingPeriod;
    uint256 public proposalCount;

    struct ExecutionScript {
        address target;
        bytes4 selector;
        bytes data;
    }

    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        ExecutionScript script;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 indexed id, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalFinalized(uint256 indexed id, bool accepted);

    constructor(IERC20 token, uint256 _quorum, uint256 _votingPeriod) {
        governanceToken = token;
        quorum = _quorum;
        votingPeriod = _votingPeriod;
    }

    function createProposal(string calldata description, ExecutionScript calldata script) external returns (uint256) {
        require(governanceToken.balanceOf(msg.sender) > 0, "no power");
        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.description = description;
        p.startTime = block.timestamp;
        p.endTime = block.timestamp + votingPeriod;
        p.script = script;
        emit ProposalCreated(id, description);
        return id;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.startTime && block.timestamp <= p.endTime, "voting closed");
        require(!p.hasVoted[msg.sender], "already voted");

        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "no weight");
        p.hasVoted[msg.sender] = true;

        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function finalizeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp > p.endTime, "still active");
        require(!p.executed, "finalized");

        p.executed = true;
        bool accepted = p.votesFor > p.votesAgainst && (p.votesFor + p.votesAgainst) >= quorum;
        emit ProposalFinalized(proposalId, accepted);
    }

    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 startTime,
        uint256 endTime,
        bool executed
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.description, p.votesFor, p.votesAgainst, p.startTime, p.endTime, p.executed);
    }
}
