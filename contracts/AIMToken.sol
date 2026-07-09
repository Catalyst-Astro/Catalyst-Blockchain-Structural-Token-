// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AIM Token — AI Module Token
/// @notice Utility token for AI compute consumption in the Catalyst ecosystem.
///         1 AIM ≈ $0.01 USD of AI compute (DeepSeek, Ollama, ARKE).
///
///         ┌──────────────────────────────────────────────────────────┐
///         │                    AI ECONOMY FLOW                       │
///         │                                                          │
///         │  User pays CAT ──→ ServicePricing ──→ AIM minted         │
///         │  User spends AIM ──→ AI provider ──→ AIM burned          │
///         │                                                          │
///         │  CAT ──gateway──→ AIM ──compute──→ Burn                 │
///         └──────────────────────────────────────────────────────────┘
///
///         Supply: capped at 1B AIM. Minted only by AIServiceMeter.
///         Burn: anyone can burn their own AIM (pay for AI calls).
contract AIMToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant METER_ROLE = keccak256("METER_ROLE");

    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether; // 1B AIM cap
    uint256 public totalAIBurned;  // lifetime AIM consumed by AI calls

    event AIMPurchased(address indexed user, uint256 catPaid, uint256 aimReceived);
    event AIMConsumed(address indexed user, address indexed provider, uint256 aimAmount, bytes32 serviceId);

    constructor() ERC20("AI Module Token", "AIM") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(METER_ROLE, msg.sender);
    }

    /// @notice Mint AIM credits to user. Only MINTER_ROLE (AIServiceMeter).
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "AIM: MAX_SUPPLY exceeded");
        _mint(to, amount);
    }

    /// @notice Burn AIM on behalf of user (AI consumption). Only METER_ROLE.
    function consume(address from, uint256 amount) external onlyRole(METER_ROLE) {
        _burn(from, amount);
        totalAIBurned += amount;
    }

    /// @notice Burn own AIM directly (user pays for AI call).
    function payForAI(uint256 amount) external {
        _burn(msg.sender, amount);
        totalAIBurned += amount;
        emit AIMConsumed(msg.sender, address(0), amount, bytes32(0));
    }

    /// @notice View how much AIM has been consumed by AI services.
    function totalAIComputeConsumed() external view returns (uint256) {
        return totalAIBurned;
    }
}
