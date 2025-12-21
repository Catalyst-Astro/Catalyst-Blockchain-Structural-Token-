// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IListingPolicyRegistry {
    function isTransferAllowed(address from, address to, uint256 amount) external view returns (bool);

    function consumeTransfer(address from, address to, uint256 amount) external;
}
