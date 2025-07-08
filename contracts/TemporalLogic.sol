// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TemporalLogic
/// @notice Helper library for simple time window checks used by the
/// Spiral Governance Engine.
library TemporalLogic {
    /// @notice Determine if the current block timestamp is within a range.
    /// @param start Start of the activation window.
    /// @param end End of the activation window.
    function within(uint256 start, uint256 end) internal view returns (bool) {
        return block.timestamp >= start && block.timestamp <= end;
    }
}
