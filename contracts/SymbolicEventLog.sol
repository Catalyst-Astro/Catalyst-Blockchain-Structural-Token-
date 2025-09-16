// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @title SymbolicEventLog
/// @notice Minimal registry for symbolic events validated by ID.
contract SymbolicEventLog {
    struct EventInfo {
        address emitter;
        string data;
        bool exists;
    }

    mapping(uint256 => EventInfo) private events;

    event EventRegistered(uint256 indexed id, address indexed emitter, string data);

    /// @notice Register a new event.
    function registerEvent(uint256 id, string calldata data) external {
        require(!events[id].exists, "exists");
        events[id] = EventInfo(msg.sender, data, true);
        emit EventRegistered(id, msg.sender, data);
    }

    /// @notice Validate that an event ID exists.
    function validateEvent(uint256 id) external view returns (bool) {
        return events[id].exists;
    }
}
