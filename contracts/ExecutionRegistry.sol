// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ExecutionRegistry
/// @notice Maintains a whitelist of allowed function selectors per target contract.
contract ExecutionRegistry is Ownable {
    mapping(address => mapping(bytes4 => bool)) public allowed;

    event FunctionAllowed(address indexed target, bytes4 indexed selector, bool allowed);

    /// @notice Set permission for a selector on a target contract.
    function setAllowed(address target, bytes4 selector, bool allowedStatus) external onlyOwner {
        allowed[target][selector] = allowedStatus;
        emit FunctionAllowed(target, selector, allowedStatus);
    }

    /// @notice Check if a selector on a target is permitted.
    function isAllowed(address target, bytes4 selector) external view returns (bool) {
        return allowed[target][selector];
    }
}
