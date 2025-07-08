// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./SymbolicEventLog.sol";

/// @title FractalStaking
/// @notice Stake FRT tokens with a purpose tied to a symbolic event.
contract FractalStaking {
    IERC20 public immutable frt;
    SymbolicEventLog public immutable eventLog;

    mapping(address => uint256) public staked;

    event Staked(
        address indexed user,
        uint256 amount,
        string purpose,
        string arquetipo,
        uint256 eventoId
    );

    constructor(IERC20 frtToken, SymbolicEventLog log) {
        frt = frtToken;
        eventLog = log;
    }

    /// @notice Stake tokens for a specific purpose validated by an event.
    function stakeWithPurpose(
        uint256 amount,
        string memory purpose,
        string memory arquetipo,
        uint256 evento_id
    ) external {
        require(eventLog.validateEvent(evento_id), "invalid event");
        require(frt.transferFrom(msg.sender, address(this), amount), "transfer failed");
        staked[msg.sender] += amount;
        emit Staked(msg.sender, amount, purpose, arquetipo, evento_id);
    }
}
