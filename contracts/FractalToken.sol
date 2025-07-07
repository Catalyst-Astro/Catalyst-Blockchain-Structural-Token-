// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Fractal Token (FRT)
/// @notice Basic ERC20 token to be locked in the bridge vault.
contract FractalToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("Fractal Token", "FRT") {
        _mint(msg.sender, initialSupply);
    }
}
