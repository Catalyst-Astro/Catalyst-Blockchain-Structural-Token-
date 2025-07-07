// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

        p.voted[msg.sender] = true;
        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }
        emit Voted(proposalId, msg.sender, support, weight);
    }

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
    }
}
