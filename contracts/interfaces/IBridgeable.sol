// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

interface IBridgeable {
    function lockTokens(uint256 amount, string calldata destChain) external;
    function releaseTokens(address user, uint256 amount, bytes32 burnTxHash) external;
}
