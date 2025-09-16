// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IExecutable {
    function execute(address target, bytes4 selector, bytes calldata data) external returns (bytes memory);
}
