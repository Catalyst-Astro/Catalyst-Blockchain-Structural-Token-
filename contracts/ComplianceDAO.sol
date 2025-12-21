// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ComplianceTypes.sol";
import "./ComplianceVotingPolicy.sol";
import "./ComplianceExecutionBridge.sol";
import "./interfaces/IIdentitySBT.sol";

/// @title ComplianceDAO
/// @notice DAO committee for compliance decisions with auditable voting.
contract ComplianceDAO is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL_MEMBER = keccak256("DAO_COUNCIL_MEMBER");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant EMERGENCY_SIGNER = keccak256("EMERGENCY_SIGNER");
    bytes32 public constant FIDUCIARY_OBSERVER = keccak256("FIDUCIARY_OBSERVER");

    enum ProposalStatus {
        OPEN,
        APPROVED,
        REJECTED,
        EXPIRED
    }

    struct Proposal {
        ProposalType proposalType;
        bytes32 descriptionHash;
        bytes32 relatedCaseId;
        bytes32 actionHash;
        uint64 startBlock;
        uint64 endBlock;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 quorumRequired;
        uint256 eligibleVoters;
        uint16 quorumBps;
        uint16 approvalBps;
        bytes32 voterRole;
        ProposalStatus status;
        bool executed;
    }

    ComplianceVotingPolicy public votingPolicy;
    ComplianceExecutionBridge public executionBridge;
    IIdentitySBT public identitySbt;
    bool public sbtRequired;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => mapping(address => bool)) private hasVoted;
    mapping(bytes32 => uint256) public roleMemberCount;

    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType proposalType,
        bytes32 descriptionHash,
        bytes32 relatedCaseId,
        bytes32 actionHash,
        uint64 startBlock,
        uint64 endBlock,
        uint256 quorumRequired
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalFinalized(uint256 indexed proposalId, ProposalStatus status);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    event ProposalRejected(uint256 indexed proposalId);
    event VotingPolicySet(address indexed policy);
    event ExecutionBridgeSet(address indexed bridge);
    event IdentitySbtSet(address indexed sbt);
    event SbtRequiredSet(bool required);

    constructor(address admin, address votingPolicy_) {
        require(admin != address(0), "admin required");
        require(votingPolicy_ != address(0), "policy required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL_MEMBER, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(EMERGENCY_SIGNER, admin);
        _grantRole(FIDUCIARY_OBSERVER, admin);

        roleMemberCount[COMPLIANCE_ADMIN] = 1;
        roleMemberCount[DAO_COUNCIL_MEMBER] = 1;
        roleMemberCount[LEGAL_AUDITOR] = 1;
        roleMemberCount[EMERGENCY_SIGNER] = 1;
        roleMemberCount[FIDUCIARY_OBSERVER] = 1;

        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL_MEMBER, COMPLIANCE_ADMIN);
        _setRoleAdmin(LEGAL_AUDITOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(EMERGENCY_SIGNER, COMPLIANCE_ADMIN);
        _setRoleAdmin(FIDUCIARY_OBSERVER, COMPLIANCE_ADMIN);

        votingPolicy = ComplianceVotingPolicy(votingPolicy_);
        emit VotingPolicySet(votingPolicy_);
    }

    function setVotingPolicy(address policy) external onlyRole(COMPLIANCE_ADMIN) {
        require(policy != address(0), "policy required");
        votingPolicy = ComplianceVotingPolicy(policy);
        emit VotingPolicySet(policy);
    }

    function setExecutionBridge(address bridge) external onlyRole(COMPLIANCE_ADMIN) {
        executionBridge = ComplianceExecutionBridge(bridge);
        emit ExecutionBridgeSet(bridge);
    }

    function setIdentitySbt(address sbt) external onlyRole(COMPLIANCE_ADMIN) {
        identitySbt = IIdentitySBT(sbt);
        emit IdentitySbtSet(sbt);
    }

    function setSbtRequired(bool required) external onlyRole(COMPLIANCE_ADMIN) {
        sbtRequired = required;
        emit SbtRequiredSet(required);
    }

    function propose(
        ProposalType proposalType,
        bytes32 descriptionHash,
        bytes32 relatedCaseId,
        bytes32 actionHash
    ) external returns (uint256 proposalId) {
        require(hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL_MEMBER, msg.sender), "not authorized");
        require(descriptionHash != bytes32(0), "description hash required");

        ComplianceVotingPolicy.PolicyConfig memory config = votingPolicy.activePolicyForType(proposalType);
        require(config.exists, "policy not configured");
        uint256 eligible = roleMemberCount[config.voterRole];
        require(eligible > 0, "no eligible voters");

        proposalId = proposalCount;
        proposalCount += 1;

        uint256 quorumRequired = _calcQuorum(eligible, config.quorumBps);

        proposals[proposalId] = Proposal({
            proposalType: proposalType,
            descriptionHash: descriptionHash,
            relatedCaseId: relatedCaseId,
            actionHash: actionHash,
            startBlock: uint64(block.number),
            endBlock: uint64(block.number + config.votingPeriodBlocks),
            votesFor: 0,
            votesAgainst: 0,
            quorumRequired: quorumRequired,
            eligibleVoters: eligible,
            quorumBps: config.quorumBps,
            approvalBps: config.approvalBps,
            voterRole: config.voterRole,
            status: ProposalStatus.OPEN,
            executed: false
        });

        emit ProposalCreated(
            proposalId,
            proposalType,
            descriptionHash,
            relatedCaseId,
            actionHash,
            uint64(block.number),
            uint64(block.number + config.votingPeriodBlocks),
            quorumRequired
        );
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.OPEN, "proposal closed");
        require(block.number >= proposal.startBlock && block.number <= proposal.endBlock, "voting closed");
        require(!hasVoted[proposalId][msg.sender], "already voted");
        require(hasRole(proposal.voterRole, msg.sender), "not eligible");
        if (sbtRequired) {
            require(address(identitySbt) != address(0), "identity SBT not set");
            require(identitySbt.isIdentityValid(msg.sender), "identity invalid");
        }

        hasVoted[proposalId][msg.sender] = true;
        if (support) {
            proposal.votesFor += 1;
        } else {
            proposal.votesAgainst += 1;
        }
        emit VoteCast(proposalId, msg.sender, support);
    }

    function finalize(uint256 proposalId) public {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.OPEN, "already finalized");
        require(block.number > proposal.endBlock, "voting active");

        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        if (totalVotes < proposal.quorumRequired) {
            proposal.status = ProposalStatus.EXPIRED;
        } else if (_meetsApproval(proposal.votesFor, totalVotes, proposal.approvalBps)) {
            proposal.status = ProposalStatus.APPROVED;
        } else {
            proposal.status = ProposalStatus.REJECTED;
            emit ProposalRejected(proposalId);
        }

        emit ProposalFinalized(proposalId, proposal.status);
    }

    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.status == ProposalStatus.OPEN && block.number > proposal.endBlock) {
            finalize(proposalId);
        }
        require(proposal.status == ProposalStatus.APPROVED, "not approved");
        require(!proposal.executed, "already executed");

        if (address(executionBridge) != address(0)) {
            bytes32 actionHash = executionBridge.actionHash(proposalId);
            if (proposal.actionHash != bytes32(0)) {
                require(actionHash == proposal.actionHash, "action hash mismatch");
            }
            executionBridge.executeAction(proposalId);
        }

        proposal.executed = true;
        emit ProposalExecuted(proposalId, msg.sender);
    }

    function proposalInfo(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function hasVotedOn(uint256 proposalId, address voter) external view returns (bool) {
        return hasVoted[proposalId][voter];
    }

    function _calcQuorum(uint256 eligibleVoters, uint16 quorumBps) internal pure returns (uint256) {
        if (quorumBps == 0) {
            return 0;
        }
        uint256 raw = eligibleVoters * quorumBps;
        uint256 quorum = raw / 10000;
        if (raw % 10000 != 0) {
            quorum += 1;
        }
        return quorum;
    }

    function _meetsApproval(uint256 votesFor, uint256 totalVotes, uint16 approvalBps) internal pure returns (bool) {
        if (totalVotes == 0) {
            return false;
        }
        return votesFor * 10000 >= totalVotes * approvalBps;
    }

    function grantRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        if (!hasRole(role, account)) {
            super.grantRole(role, account);
            roleMemberCount[role] += 1;
        }
    }

    function revokeRole(bytes32 role, address account) public override onlyRole(getRoleAdmin(role)) {
        if (hasRole(role, account)) {
            super.revokeRole(role, account);
            if (roleMemberCount[role] > 0) {
                roleMemberCount[role] -= 1;
            }
        }
    }

    function renounceRole(bytes32 role, address account) public override {
        require(account == msg.sender, "can only renounce for self");
        if (hasRole(role, account)) {
            super.renounceRole(role, account);
            if (roleMemberCount[role] > 0) {
                roleMemberCount[role] -= 1;
            }
        }
    }
}
