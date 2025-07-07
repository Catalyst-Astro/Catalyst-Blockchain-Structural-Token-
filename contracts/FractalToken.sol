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
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title Fractal Token
/// @notice ERC-20 token with permit functionality, minting and pausable transfers.
/// Implements standards per Swiss FINMA guidelines.
contract FractalToken is ERC20, ERC20Permit, Ownable, Pausable {
    // Store the initial token supply for audit transparency
    uint256 private immutable _initialSupply;

    /// @notice Deploy the token and mint the full initial supply to the deployer.
    /// @param initialSupply Amount of tokens to mint on deployment (in wei).

    constructor(uint256 initialSupply)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
    {

        _mint(msg.sender, initialSupply);
    }
=======
        _initialSupply = initialSupply;
        _mint(msg.sender, initialSupply);
    }

    /// @notice Return the initial supply minted at deployment.
    function initialSupply() external view returns (uint256) {
        return _initialSupply;
    }

    /// @notice Mint new tokens to `to`. Only callable by the contract owner.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burn `amount` of the caller's tokens.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @notice Pause all token transfers. Callable only by the owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token transfers. Callable only by the owner.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Prevent token transfers while paused by using the ERC-20 hook.
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override
    {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "FractalToken: token transfer while paused");
    }

}
