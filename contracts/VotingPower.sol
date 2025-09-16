// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IFractalToken.sol";

/// @notice Helper library for snapshot based voting power calculations.
library VotingPower {
    function snapshot(IFractalToken token) internal returns (uint256) {
        return token.snapshot();
    }

    function balanceAt(IFractalToken token, address voter, uint256 snapshotId) internal view returns (uint256) {
        return token.balanceOfAt(voter, snapshotId);
    }
}
