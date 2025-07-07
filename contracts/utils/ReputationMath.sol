// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReputationMath
 * @dev Library with helper math for reputation calculations.
 */
library ReputationMath {
    /**
     * @dev Compute a simplified reputation score from multiple factors.
     * @param ageBlocks Number of blocks since the user joined.
     * @param participation Total votes cast and received.
     * @param accuracy Votes cast in agreement with the majority.
     * @param economic Amount of economic activity in wei.
     */
    function computeScore(
        uint256 ageBlocks,
        uint256 participation,
        uint256 accuracy,
        uint256 economic
    ) internal pure returns (uint256) {
        uint256 ageScore = ageBlocks / 2000; // approx daily increase
        uint256 partScore = participation * 2;
        uint256 accScore = accuracy * 3;
        uint256 econScore = economic / 1e18;
        return ageScore + partScore + accScore + econScore;
    }
}
