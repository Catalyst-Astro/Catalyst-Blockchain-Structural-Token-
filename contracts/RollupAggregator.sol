// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

/// @title RollupAggregator
/// @notice Records batches of transactions for an optimistic or ZK rollup.
contract RollupAggregator {
    event BatchSubmitted(uint256 batchId, bytes32 batchRoot, uint256 batchSize);

    uint256 public nextBatchId;

    /// @notice Submit a new batch root to the main chain.
    /// @param batchRoot Merkle root of the batch's transactions.
    /// @param batchSize Number of transactions in the batch.
    function submitBatch(bytes32 batchRoot, uint256 batchSize) external {
        require(batchSize > 0, "invalid batch size");
        emit BatchSubmitted(nextBatchId, batchRoot, batchSize);
        nextBatchId += 1;
    }
}
