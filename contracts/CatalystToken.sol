// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CatalystToken
 * @dev ERC20 token with mint (inflation), burn, and reward distribution capabilities.
 */
contract CatalystToken is ERC20, ERC20Burnable, Ownable {
    uint256 public annualInflationRate; // expressed in basis points (e.g., 200 = 2%)
    uint256 public lastMintTimestamp;
    mapping(address => uint256) public rewards;

    constructor(string memory name_, string memory symbol_, uint256 initialSupply_, uint256 inflationRateBps_)
        ERC20(name_, symbol_)
    {
        _mint(msg.sender, initialSupply_);
        annualInflationRate = inflationRateBps_;
        lastMintTimestamp = block.timestamp;
    }

    /**
     * @dev Mint new tokens based on time elapsed and the inflation rate.
     */
    function mintInflation() public onlyOwner {
        uint256 elapsed = block.timestamp - lastMintTimestamp;
        if (elapsed == 0 || annualInflationRate == 0) {
            return;
        }
        uint256 supply = totalSupply();
        uint256 amount = supply * annualInflationRate * elapsed / 365 days / 10000;
        if (amount > 0) {
            _mint(owner(), amount);
            lastMintTimestamp = block.timestamp;
        }
    }

    /**
     * @dev Distribute rewards to a list of recipients.
     */
    function distributeRewards(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(owner(), recipients[i], amounts[i]);
            rewards[recipients[i]] += amounts[i];
        }
    }
}
