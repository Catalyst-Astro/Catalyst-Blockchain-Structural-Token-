// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "./interfaces/IERC20.sol";

/// @title SidechainBridge
/// @notice Minimal example of locking tokens on a main chain for use on a sidechain.
contract SidechainBridge {
    address public immutable token;
    address public owner;

    mapping(address => uint256) public lockedBalances;

    event TokensLocked(address indexed user, uint256 amount);
    event TokensUnlocked(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _token) {
        token = _token;
        owner = msg.sender;
    }

    /// @notice Lock tokens so they can be minted on a sidechain.
    function lock(uint256 amount) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "transfer failed");
        lockedBalances[msg.sender] += amount;
        emit TokensLocked(msg.sender, amount);
    }

    /// @notice Unlock tokens after burning them on the sidechain.
    function unlock(address user, uint256 amount) external onlyOwner {
        require(lockedBalances[user] >= amount, "insufficient balance");
        lockedBalances[user] -= amount;
        require(IERC20(token).transfer(user, amount), "transfer failed");
        emit TokensUnlocked(user, amount);
    }
}
