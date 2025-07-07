// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/Pausable.sol";

/// @title GuardianModule
/// @notice Emergency guardian controls for FractalDAO.
contract GuardianModule is Pausable {
    address public guardian;

    mapping(address => uint256) public frozenUntil;

    event GuardianChanged(address indexed oldGuardian, address indexed newGuardian);
    event TokensFrozen(address indexed account, uint256 until);
    event ProposalRejected(uint256 indexed proposalId, string reason);

    modifier onlyGuardian() {
        require(msg.sender == guardian, "not guardian");
        _;
    }

    constructor(address _guardian) {
        guardian = _guardian;
    }

    function changeGuardian(address newGuardian) external onlyGuardian {
        require(newGuardian != address(0), "invalid");
        emit GuardianChanged(guardian, newGuardian);
        guardian = newGuardian;
    }

    function emergencyPause() external onlyGuardian {
        _pause();
    }

    function unpause() external onlyGuardian {
        _unpause();
    }

    /// @notice Freeze transfers of a specific account until timestamp.
    function freezeTokens(address account, uint256 until) external onlyGuardian {
        require(until > block.timestamp, "invalid");
        frozenUntil[account] = until;
        emit TokensFrozen(account, until);
    }

    function rejectProposal(uint256 proposalId, string calldata reason) external onlyGuardian {
        emit ProposalRejected(proposalId, reason);
    }
}
