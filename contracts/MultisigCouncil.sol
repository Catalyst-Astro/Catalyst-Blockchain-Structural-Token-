// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IGovernanceControl.sol";

/// @title MultisigCouncil
/// @notice Simple M-of-N multisignature approval for sensitive proposals.
contract MultisigCouncil is IGovernanceControl {
    address public guardian;
    address[] public members;
    mapping(address => bool) public isMember;
    uint256 public immutable threshold;

    // proposal hash => approvals
    mapping(bytes32 => uint256) public approvals;
    mapping(bytes32 => mapping(address => bool)) public approvedBy;

    event ProposalSigned(bytes32 indexed proposalHash, address indexed signer);
    event GuardianChanged(address indexed oldGuardian, address indexed newGuardian);

    constructor(address[] memory _members, uint256 _threshold, address _guardian) {
        require(_threshold > 0 && _threshold <= _members.length, "invalid threshold");
        threshold = _threshold;
        guardian = _guardian;
        members = _members;
        for (uint256 i; i < _members.length; i++) {
            isMember[_members[i]] = true;
        }
    }

    // --- IGovernanceControl ---
    function isGuardian(address account) external view override returns (bool) {
        return account == guardian;
    }

    function isCouncilSigner(address account) external view override returns (bool) {
        return isMember[account];
    }

    /// @notice Sign a sensitive proposal hash.
    function approveSensitiveProposal(bytes32 proposalHash) external {
        require(isMember[msg.sender], "not signer");
        if (!approvedBy[proposalHash][msg.sender]) {
            approvedBy[proposalHash][msg.sender] = true;
            approvals[proposalHash] += 1;
            emit ProposalSigned(proposalHash, msg.sender);
        }
    }

    function hasEnoughApprovals(bytes32 proposalHash) public view returns (bool) {
        return approvals[proposalHash] >= threshold;
    }

    function changeGuardian(address newGuardian) external {
        require(msg.sender == guardian, "only guardian");
        require(newGuardian != address(0), "invalid");
        emit GuardianChanged(guardian, newGuardian);
        guardian = newGuardian;
    }
}
