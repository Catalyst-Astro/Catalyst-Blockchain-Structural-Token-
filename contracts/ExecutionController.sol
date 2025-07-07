// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ExecutionRegistry.sol";
import "./interfaces/IExecutable.sol";

/// @title ExecutionController
/// @notice Executes whitelisted calls through a registry.
contract ExecutionController is IExecutable {
    ExecutionRegistry public immutable registry;

    constructor(ExecutionRegistry _registry) {
        registry = _registry;
    }

    /// @inheritdoc IExecutable
    function execute(address target, bytes4 selector, bytes calldata data)
        external
        override
        returns (bytes memory result)
    {
        require(registry.isAllowed(target, selector), "not allowed");
        (bool success, bytes memory res) = target.call{gas: gasleft()}(abi.encodePacked(selector, data));
        require(success, "call failed");
        return res;
    }
}
