// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Fractal Token (FRT)
/// @notice Basic ERC20 token used for staking in the Fractal ecosystem.
contract FractalToken is ERC20, Ownable {
    constructor(uint256 initialSupply)
        ERC20("Fractal Token", "FRT")
        Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Mint new tokens to an account.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
