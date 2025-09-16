// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DelegationRegistry
 * @dev Records delegation relationships for auditability.
 */
contract DelegationRegistry {
    struct Record {
        address delegator;
        address delegatee;
        uint256 timestamp;
    }

    Record[] public history;
    event DelegationRecorded(address indexed delegator, address indexed delegatee, uint256 timestamp);

    function recordDelegation(address delegator, address delegatee) external {
        history.push(Record(delegator, delegatee, block.timestamp));
        emit DelegationRecorded(delegator, delegatee, block.timestamp);
    }
}
