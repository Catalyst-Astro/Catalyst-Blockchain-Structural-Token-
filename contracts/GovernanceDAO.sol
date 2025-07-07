// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Simple DAO Governance with Weighted Voting and Delegation
/// @notice This contract demonstrates a minimal DAO governance module with
/// weighted votes, vote delegation and protocol upgrade ability.
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract GovernanceDAO {
    IERC20 public immutable governanceToken;

    // Address representing the current protocol logic (e.g., proxy implementation)
    address public protocolAddress;

    struct Proposal {
        address newProtocolAddress;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        mapping(address => bool) voted;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;

    // Delegation state
    mapping(address => address) public delegates; // delegator -> delegatee
    mapping(address => uint256) public delegatedBalance; // delegatee -> delegated weight

    event ProposalCreated(uint256 id, address proposer, address newProtocol);
    event Voted(uint256 proposalId, address voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 proposalId, address newProtocol);
    event DelegateChanged(address delegator, address fromDelegate, address toDelegate);

    constructor(IERC20 token, address initialProtocol) {
        governanceToken = token;
        protocolAddress = initialProtocol;
    }

    /// @notice Delegate voting power to another address
    function delegate(address to) external {
        address current = delegates[msg.sender];
        uint256 balance = governanceToken.balanceOf(msg.sender);

        if (current != address(0)) {
            delegatedBalance[current] -= balance;
        }

        delegates[msg.sender] = to;
        if (to != address(0)) {
            delegatedBalance[to] += balance;
        }

        emit DelegateChanged(msg.sender, current, to);
    }

    /// @notice Create a proposal to upgrade the protocol
    function proposeProtocolUpgrade(address newProtocol) external returns (uint256) {
        require(newProtocol != address(0), "invalid");
        require(governanceToken.balanceOf(msg.sender) > 0, "no power");

        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.newProtocolAddress = newProtocol;

        emit ProposalCreated(id, msg.sender, newProtocol);
        return id;
    }

    /// @notice Cast a weighted vote on a proposal
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "executed");
        require(!p.voted[msg.sender], "voted");
        require(delegates[msg.sender] == address(0), "delegated");

        uint256 weight = governanceToken.balanceOf(msg.sender) + delegatedBalance[msg.sender];
        require(weight > 0, "no weight");

        p.voted[msg.sender] = true;
        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /// @notice Execute a successful upgrade proposal
    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "executed");
        require(p.votesFor > p.votesAgainst, "not approved");

        p.executed = true;
        protocolAddress = p.newProtocolAddress;

        emit ProposalExecuted(proposalId, p.newProtocolAddress);
    }

    /// @notice View proposal details
    function getProposal(uint256 proposalId) external view returns (
        address newProtocolAddress,
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.newProtocolAddress, p.votesFor, p.votesAgainst, p.executed);
    }
}

