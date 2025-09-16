// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Interface for the Fractal governance token (FRT)
interface IFractalToken {
    function balanceOf(address account) external view returns (uint256);
    function snapshot() external returns (uint256);
    function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256);
}
