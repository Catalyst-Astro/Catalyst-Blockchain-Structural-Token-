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
    bytes32 public constant REWARD_ADMIN = keccak256("REWARD_ADMIN");

    uint256 public constant MAX_SUPPLY = 100_000_000 ether; // 100M hard cap
    uint256 public inflationRate; // in basis points (parts per 10,000)
    uint256 public lastInflationTime;
    uint256 public rewardCooldown = 30 days; // min time between rewards per address
    uint256 public maxRewardPerPeriod = 10_000 ether; // max per address per cooldown
    mapping(address => uint256) public lastRewardTime;
    mapping(address => uint256) public totalRewarded; // lifetime rewards per address

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
        _grantRole(REWARD_ADMIN, admin);
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
        require(totalSupply() + amount <= MAX_SUPPLY, "MAX_SUPPLY exceeded");
        lastInflationTime = block.timestamp;
        _mint(msg.sender, amount);
    }

    /// @notice Mint rewards to a specific address, with rate limiting.
    /// Only accounts with MINTER_ROLE can call this function.
    function reward(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "MAX_SUPPLY exceeded");
        if (lastRewardTime[to] > 0) {
            require(block.timestamp >= lastRewardTime[to] + rewardCooldown, "reward: cooldown active");
        }
        require(amount <= maxRewardPerPeriod, "reward: exceeds per-period cap");
        lastRewardTime[to] = block.timestamp;
        totalRewarded[to] += amount;
        _mint(to, amount);
    }

    /// @notice Admin: update reward parameters.
    function setRewardParams(uint256 cooldown_, uint256 maxPerPeriod_) external onlyRole(REWARD_ADMIN) {
        rewardCooldown = cooldown_;
        maxRewardPerPeriod = maxPerPeriod_;
    }
}

