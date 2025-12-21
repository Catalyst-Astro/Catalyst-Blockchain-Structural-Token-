// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOperationsRegistry {
    function recordAuditCheckpoint(
        bytes32 checkpointId,
        bytes32 scope,
        bytes32 evidenceHash,
        uint64 periodStart,
        uint64 periodEnd
    ) external;
}
