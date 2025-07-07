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
=======

import "./GuardianModule.sol";
import "./MultisigCouncil.sol";
import "./ProposalValidator.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

/// @title FractalDAO
/// @notice Governance contract with council approvals and guardian emergency controls.
contract FractalDAO is GuardianModule {
    IERC20 public immutable governanceToken;
    address public protocolAddress;

    MultisigCouncil public council;
    ProposalValidator public validator;
    uint256 public timelockDelay;

    struct Proposal {
        address newProtocolAddress;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        uint256 eta;
        mapping(address => bool) voted;
=======
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
=======
        mapping(address => bool) voted;
        bool executed;

    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;


    event ProposalCreated(uint256 id, address proposer, address newProtocol);
    event Voted(uint256 proposalId, address voter, bool support, uint256 weight);
    event ProposalQueued(uint256 id, uint256 eta);
    event ProposalExecuted(uint256 id, address newProtocol);

    constructor(IERC20 token, address initialProtocol, address _guardian, MultisigCouncil _council, ProposalValidator _validator, uint256 _delay)
        GuardianModule(_guardian)
    {
        governanceToken = token;
        protocolAddress = initialProtocol;
        council = _council;
        validator = _validator;
        timelockDelay = _delay;
    }

    /// @notice Delegate voting power is not implemented for brevity

    function proposeProtocolUpgrade(address newProtocol) external returns (uint256) {
        require(newProtocol != address(0), "invalid");
        require(governanceToken.balanceOf(msg.sender) > 0, "no power");
        uint256 id = proposalCount++;
        Proposal storage p = proposals[id];
        p.newProtocolAddress = newProtocol;
        emit ProposalCreated(id, msg.sender, newProtocol);
        return id;
    }

    function vote(uint256 proposalId, bool support) external whenNotPaused {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "executed");
        require(!p.voted[msg.sender], "voted");

        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "no weight");
=======
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

        require(block.timestamp >= p.start && block.timestamp <= p.end, "voting closed");
        require(!voted[proposalId][msg.sender], "voted");
        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "no weight");
        voted[proposalId][msg.sender] = true;
        if (support) {
            p.votesFor += weight;
=======
        require(!p.executed, "executed");
        require(!p.voted[msg.sender], "voted");
        require(reputation.delegates(msg.sender) == address(0), "delegated");

        uint256 weight = votingPower(msg.sender);
        require(weight > 0, "no power");


        p.voted[msg.sender] = true;
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
=======
    function queueProposal(uint256 proposalId) external whenNotPaused {
        Proposal storage p = proposals[proposalId];
        require(p.eta == 0, "already queued");
        require(!p.executed, "executed");
        require(p.votesFor > p.votesAgainst, "not approved");
        p.eta = block.timestamp + timelockDelay;
        emit ProposalQueued(proposalId, p.eta);
    }

    function approveSensitiveProposal(uint256 proposalId) external {
        bytes32 hash = keccak256(abi.encodePacked(address(this), proposalId));
        council.approveSensitiveProposal(hash);
    }

    function executeProposal(uint256 proposalId) external whenNotPaused {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "executed");
        require(p.eta != 0 && block.timestamp >= p.eta, "timelock");

        if (validator.isSensitive(proposalId)) {
            bytes32 hash = keccak256(abi.encodePacked(address(this), proposalId));
            require(council.hasEnoughApprovals(hash), "council not approved");
        }

        p.executed = true;
        protocolAddress = p.newProtocolAddress;
        emit ProposalExecuted(proposalId, p.newProtocolAddress);
    }

    function getProposal(uint256 proposalId) external view returns (
        address newProtocolAddress,
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed,
        uint256 eta
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.newProtocolAddress, p.votesFor, p.votesAgainst, p.executed, p.eta);

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
