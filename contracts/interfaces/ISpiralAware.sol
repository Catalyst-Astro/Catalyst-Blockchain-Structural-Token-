// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ISpiralAware
/// @notice Interface for modules that react to cycle changes in the Spiral Governance Engine.
interface ISpiralAware {
    /// @notice Called when a cycle advances or is completed.
    /// @param cycleId Identifier of the cycle that changed.
    function onCycleAdvance(uint256 cycleId) external;
}
