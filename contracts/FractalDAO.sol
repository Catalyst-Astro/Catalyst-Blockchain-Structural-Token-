// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ReputationGovernance.sol";
import "./DelegationRegistry.sol";

/**
 * @title FractalDAO
 * @dev Basic DAO demonstrating integration with ReputationGovernance for weighted voting.
 */
contract FractalDAO {
    IERC20 public immutable frtToken;
    ReputationGovernance public reputation;

    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        mapping(address => bool) voted;
        bool executed;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;

    event ProposalCreated(uint256 id, string description);
    event Voted(uint256 proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 proposalId, bool passed);

    constructor(IERC20 token, uint256 activityThreshold, DelegationRegistry registry) {
        frtToken = token;
        reputation = new ReputationGovernance(token, activityThreshold, registry);
    }

    function createProposal(string calldata description) external returns (uint256) {
        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.description = description;
        emit ProposalCreated(id, description);
        return id;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "executed");
        require(!p.voted[msg.sender], "voted");
        require(reputation.delegates(msg.sender) == address(0), "delegated");

        uint256 weight = votingPower(msg.sender);
        require(weight > 0, "no power");

        p.voted[msg.sender] = true;
        if (support) {
            p.votesFor += weight;
            reputation.recordVote(msg.sender, true);
        } else {
            p.votesAgainst += weight;
            reputation.recordVote(msg.sender, false);
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function execute(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "executed");
        p.executed = true;
        bool passed = p.votesFor > p.votesAgainst;
        emit ProposalExecuted(proposalId, passed);
    }

    function votingPower(address user) public view returns (uint256) {
        uint256 base = frtToken.balanceOf(user) + reputation.getDelegatedVotes(user);
        uint256 repWeight = reputation.weightFromReputation(reputation.getReputationScore(user));
        return base + repWeight;
    }

    function delegate(address to) external {
        reputation.delegate(to);
    }

    function undelegate() external {
        reputation.undelegate();
    }
}
