// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title FractalToken (FRT)
 * @notice ERC-20 token including ERC-2612 permit functionality.
 *
 * This implementation uses OpenZeppelin libraries to ensure
 * cryptographic security and compatibility with common auditing
 * standards. The code follows recommendations from Swiss FINMA
 * regarding clear documentation and adherence to best practices.
 *
 * Compatibility: Gnosis Safe, Ethers.js, Hardhat, Remix and Truffle.
 */
contract FractalToken is ERC20Permit {
    /**
     * @notice Mint initial supply and set up EIP712 domain for permits.
     * @param initialSupply Amount of tokens minted to the deployer.
     */
    constructor(uint256 initialSupply)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
    {
        _mint(msg.sender, initialSupply);
    }
}
