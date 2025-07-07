// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FractalToken
/// @dev Simple ERC20 token with ERC-2612 permit and owner controlled minting.
contract FractalToken is ERC20, ERC20Permit, Ownable {
    constructor(uint256 initialSupply, address initialOwner)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
        Ownable(initialOwner)
    {
        _mint(initialOwner, initialSupply);
    }

    /// @notice Mint new tokens. Only owner can call.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
