// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Treasury
/// @notice Bóveda operativa para custodiar ETH y tokens ERC20 con roles y límites básicos.
/// @dev Compatible con múltiples activos; usar junto a SettlementLog para evidenciar volumen.
contract Treasury is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    /// @dev asset => allowed
    mapping(address => bool) public allowedAsset;

    /// @dev asset => daily limit per operator (optional)
    mapping(address => uint256) public dailyLimit;
    /// @dev operator => asset => dayIdx => spent
    mapping(address => mapping(address => mapping(uint64 => uint256))) private _dailySpent;

    event AssetAllowed(address indexed asset, bool allowed);
    event DailyLimitSet(address indexed asset, uint256 limit);
    event Deposited(address indexed asset, address indexed from, uint256 amount);
    event Withdrawn(address indexed asset, address indexed to, uint256 amount, string refCode);
    event Swept(address indexed asset, address indexed to, uint256 amount);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);
    }

    // -------- admin ----------

    function setAllowedAsset(address asset, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allowedAsset[asset] = allowed;
        emit AssetAllowed(asset, allowed);
    }

    function setDailyLimit(address asset, uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        dailyLimit[asset] = limit;
        emit DailyLimitSet(asset, limit);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // -------- deposits ----------

    receive() external payable {
        emit Deposited(address(0), msg.sender, msg.value);
    }

    function depositERC20(IERC20 token, uint256 amount) external whenNotPaused {
        require(allowedAsset[address(token)], "asset not allowed");
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(address(token), msg.sender, amount);
    }

    // -------- withdrawals ----------

    function _checkLimits(address asset, uint256 amount) internal {
        uint256 limit = dailyLimit[asset];
        if (limit == 0) return; // no limit
        uint64 dayIdx = uint64(block.timestamp / 1 days);
        uint256 spent = _dailySpent[msg.sender][asset][dayIdx];
        require(spent + amount <= limit, "over daily limit");
        _dailySpent[msg.sender][asset][dayIdx] = spent + amount;
    }

    function withdrawETH(address payable to, uint256 amount, string calldata refCode)
        external
        whenNotPaused
        nonReentrant
        onlyRole(OPERATOR_ROLE)
    {
        require(allowedAsset[address(0)], "asset not allowed");
        _checkLimits(address(0), amount);
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "eth transfer failed");
        emit Withdrawn(address(0), to, amount, refCode);
    }

    function withdrawERC20(IERC20 token, address to, uint256 amount, string calldata refCode)
        external
        whenNotPaused
        nonReentrant
        onlyRole(OPERATOR_ROLE)
    {
        address asset = address(token);
        require(allowedAsset[asset], "asset not allowed");
        _checkLimits(asset, amount);
        token.safeTransfer(to, amount);
        emit Withdrawn(asset, to, amount, refCode);
    }

    function batchWithdrawERC20(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata refCode
    ) external whenNotPaused nonReentrant onlyRole(OPERATOR_ROLE) {
        require(recipients.length == amounts.length, "length mismatch");
        address asset = address(token);
        require(allowedAsset[asset], "asset not allowed");
        uint256 total;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        _checkLimits(asset, total);
        for (uint256 i = 0; i < recipients.length; i++) {
            token.safeTransfer(recipients[i], amounts[i]);
        }
        emit Withdrawn(asset, address(0), total, refCode);
    }

    // -------- emergency sweep (admin only) ----------

    function sweepETH(address payable to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "sweep eth failed");
        emit Swept(address(0), to, amount);
    }

    function sweepERC20(IERC20 token, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        token.safeTransfer(to, amount);
        emit Swept(address(token), to, amount);
    }
}

