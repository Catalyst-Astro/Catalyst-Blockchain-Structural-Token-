// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IExecutable.sol";
import "./ExecutionRegistry.sol";

/// @title FractalDAO
/// @notice Simple DAO with automated execution of approved proposals.
contract FractalDAO is ReentrancyGuard {
    IERC20 public immutable governanceToken;
    IExecutable public executionController;
    ExecutionRegistry public executionRegistry;
    uint256 public quorum;
    uint256 public votingPeriod;

    struct ExecutionScript {
        address target;
        bytes4 selector;
        bytes data;
    }

    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 start;
        uint256 end;
        bool executed;
        ExecutionScript script;
    }

    uint256 public proposalCount;
    mapping(uint256 => mapping(address => bool)) public voted;
    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 indexed id, string description);
    event Voted(uint256 indexed id, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id, address target, bytes4 selector);

    constructor(IERC20 token, IExecutable controller, ExecutionRegistry registry, uint256 _quorum, uint256 _votingPeriod) {
        governanceToken = token;
        executionController = controller;
        executionRegistry = registry;
        quorum = _quorum;
        votingPeriod = _votingPeriod;
    }

    function createProposal(string calldata description, ExecutionScript calldata script) external returns (uint256) {
        require(governanceToken.balanceOf(msg.sender) > 0, "no power");
        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.description = description;
        p.start = block.timestamp;
        p.end = block.timestamp + votingPeriod;
        p.script = script;
        emit ProposalCreated(id, description);
        return id;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.start && block.timestamp <= p.end, "voting closed");
        require(!voted[proposalId][msg.sender], "voted");
        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "no weight");
        voted[proposalId][msg.sender] = true;
        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }
        emit Voted(proposalId, msg.sender, support, weight);
    }

    function finalizeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp > p.end, "voting ongoing");
        require(!p.executed, "executed");
        uint256 totalVotes = p.votesFor + p.votesAgainst;
        require(totalVotes >= quorum, "no quorum");
        require(p.votesFor > p.votesAgainst, "no majority");

        p.executed = true;

        if (p.script.target != address(0)) {
            require(executionRegistry.isAllowed(p.script.target, p.script.selector), "not allowed");
            executionController.execute{gas: 200000}(p.script.target, p.script.selector, p.script.data);
            emit ProposalExecuted(proposalId, p.script.target, p.script.selector);
        } else {
            emit ProposalExecuted(proposalId, address(0), bytes4(0));
        }
    }
}
