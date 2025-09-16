// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../enums/EventType.sol";

struct TraceLog {
    uint256 traceId;
    EventType eventType;
    address actor;
    address target;
    uint256 amount;
    uint256 blockNumber;
    uint256 timestamp;
    bytes32 referenceHash;
}

interface ITraceable {
    event TraceRecorded(TraceLog log);

    function recordTrace(
        EventType eventType,
        address actor,
        address target,
        uint256 amount,
        bytes32 referenceHash
    ) external;

    function getTraceByAddress(address account) external view returns (TraceLog[] memory);
}
