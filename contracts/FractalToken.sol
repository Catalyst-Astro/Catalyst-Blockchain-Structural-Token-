// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "./extensions/PurposeTag.sol";

/**
 * @title FractalToken
 * @notice ERC20 token with permit, pausable transfers and optional narrative tags.
 * Designed for cooperative DAO ecosystems and symbolic token flows.
 */
contract FractalToken is ERC20, ERC20Burnable, ERC20Permit, Pausable, Ownable, PurposeTag {
    /**
     * @dev Mint initial supply to deployer and initialize ownership.
     * @param initialSupply Amount of tokens minted to the owner on deployment.
     */
    constructor(uint256 initialSupply)
        ERC20("Fractal Token", "FRT")
        ERC20Permit("Fractal Token")
        Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Mint new tokens to an address. Restricted to owner.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burn tokens from the caller while not paused.
    function burn(uint256 amount) public override whenNotPaused {
        super.burn(amount);
    }

    /// @notice Pause all token transfers.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause token transfers.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Attach a narrative purpose to the next DAO interaction.
    function purposeTag(string memory purpose) external whenNotPaused {
        _tagPurpose(_msgSender(), purpose);
    }

    /// @dev Hook to block transfers while paused.
    function _update(address from, address to, uint256 amount) internal override whenNotPaused {
        super._update(from, to, amount);
    }
}
