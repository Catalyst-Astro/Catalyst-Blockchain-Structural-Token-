// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ITraceable.sol";
import "./modifiers/AuthControl.sol";

/**
 * @title TraceRegistry
 * @dev Stores TraceLog events emitted by authorized contracts.
 */
contract TraceRegistry is AuthControl, ITraceable {
    TraceLog[] private _logs;
    uint256 private _counter;
    mapping(address => uint256[]) private _logsByAddress;

    /**
     * @dev Record a trace log. Can only be called by authorized contracts.
     */
    function recordTrace(
        EventType eventType,
        address actor,
        address target,
        uint256 amount,
        bytes32 referenceHash
    ) external override onlyAuthorized {
        TraceLog memory log = TraceLog({
            traceId: _counter++,
            eventType: eventType,
            actor: actor,
            target: target,
            amount: amount,
            blockNumber: block.number,
            timestamp: block.timestamp,
            referenceHash: referenceHash
        });

        _logs.push(log);
        _logsByAddress[actor].push(log.traceId);
        if (target != address(0)) {
            _logsByAddress[target].push(log.traceId);
        }

        emit TraceRecorded(log);
    }

    /**
     * @dev Return all trace logs for a given address.
     */
    function getTraceByAddress(address account) external view override returns (TraceLog[] memory) {
        uint256[] storage ids = _logsByAddress[account];
        TraceLog[] memory res = new TraceLog[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            res[i] = _logs[ids[i]];
        }
        return res;
    }

    /**
     * @dev Optional helper to export logs as JSON string.
     */
    function exportAsJSON(address account) external view returns (string memory) {
        TraceLog[] memory logs = this.getTraceByAddress(account);
        bytes memory json = "[";
        for (uint256 i = 0; i < logs.length; i++) {
            TraceLog memory l = logs[i];
            json = bytes.concat(
                json,
                "{\"traceId\":", bytes(_toString(l.traceId)),
                ",\"eventType\":", bytes(_toString(uint256(l.eventType))),
                ",\"actor\":\"", bytes(_toHex(l.actor)), "\"",
                ",\"target\":\"", bytes(_toHex(l.target)), "\"",
                ",\"amount\":", bytes(_toString(l.amount)),
                ",\"blockNumber\":", bytes(_toString(l.blockNumber)),
                ",\"timestamp\":", bytes(_toString(l.timestamp)),
                ",\"referenceHash\":\"", bytes(_toHex32(l.referenceHash)), "\"" ,
                "}"
            );
            if (i + 1 < logs.length) json = bytes.concat(json, ",");
        }
        json = bytes.concat(json, "]");
        return string(json);
    }

    // Internal helpers for JSON encoding
    function _toString(uint256 value) private pure returns (string memory) {
        return _uintToString(value);
    }

    function _uintToString(uint256 v) private pure returns (string memory str) {
        if (v == 0) {
            return "0";
        }
        uint256 j = v;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = v;
        while (j != 0) {
            k = k - 1;
            bstr[k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }

    function _toHex(address a) private pure returns (string memory) {
        return _toHex(uint256(uint160(a)), 20);
    }

    function _toHex32(bytes32 data) private pure returns (string memory) {
        return _toHex(uint256(data), 32);
    }

    function _toHex(uint256 value, uint256 length) private pure returns (string memory) {
        bytes16 hexSymbols = 0x30313233343536373839616263646566;
        bytes memory str = new bytes(2 * length);
        for (uint256 i = 0; i < length; i++) {
            str[2 * length - 2 - 2 * i] = hexSymbols[value & 0xf];
            value >>= 4;
            str[2 * length - 1 - 2 * i] = hexSymbols[value & 0xf];
            value >>= 4;
        }
        return string(str);
    }
}
