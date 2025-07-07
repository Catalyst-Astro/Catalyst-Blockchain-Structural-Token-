// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InflationaryRewardToken
 * @dev ERC20 token with burn mechanism, periodic inflation, and reward distribution.
 */
contract InflationaryRewardToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public inflationRate; // in basis points (parts per 10,000)
    uint256 public lastInflationTime;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply,
        uint256 inflationRateBps,
        address admin
    ) ERC20(name_, symbol_) {
        _mint(admin, initialSupply);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        inflationRate = inflationRateBps;
        lastInflationTime = block.timestamp;
    }

    /**
     * @notice Mint new tokens according to the inflation rate.
     * Can only be called once every 365 days by an account with MINTER_ROLE.
     */
    function mintInflation() external onlyRole(MINTER_ROLE) {
        require(block.timestamp >= lastInflationTime + 365 days, "Inflation: too soon");
        uint256 amount = (totalSupply() * inflationRate) / 10000;
        lastInflationTime = block.timestamp;
        _mint(msg.sender, amount);
    }

    /**
     * @notice Mint rewards to a specific address.
     * Only accounts with MINTER_ROLE can call this function.
     */
    function reward(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}

