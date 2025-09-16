// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AuditManager
 * @notice Stores audit trail events emitted by other contracts and allows
 * querying aggregated data. A simplified example for demonstration.
 */
contract AuditManager {
    struct EventRecord {
        address contractAddress;
        address wallet;
        string eventType;
        uint256 amount;
        bytes data;
        uint256 timestamp;
    }

    struct BridgeTransfer {
        address contractAddress;
        address wallet;
        uint256 amount;
        string destination;
        uint256 timestamp;
    }

    EventRecord[] private events;
    BridgeTransfer[] private bridgeTransfers;

    mapping(address => uint256[]) private eventsByWallet;
    mapping(string => uint256[]) private bridgedByNetwork;

    event AuditEventRecorded(uint256 indexed id, address indexed wallet, string eventType);
    event AuditReportRegistered(bytes32 reportHash, uint256 timestamp);

    /**
     * @notice Record a generic event emitted by another contract.
     * @dev In practice contracts would call this hook in their event logic.
     */
    function recordEvent(
        address wallet,
        string calldata eventType,
        uint256 amount,
        bytes calldata data
    ) external {
        events.push(EventRecord(msg.sender, wallet, eventType, amount, data, block.timestamp));
        eventsByWallet[wallet].push(events.length - 1);
        emit AuditEventRecorded(events.length - 1, wallet, eventType);
    }

    /**
     * @notice Record a bridged transfer with destination network.
     */
    function recordBridgeTransfer(
        address wallet,
        uint256 amount,
        string calldata destination
    ) external {
        bridgeTransfers.push(BridgeTransfer(msg.sender, wallet, amount, destination, block.timestamp));
        bridgedByNetwork[destination].push(bridgeTransfers.length - 1);
        emit AuditEventRecorded(events.length, wallet, "Bridge");
    }

    /**
     * @notice Retrieve all audit events involving a specific wallet.
     */
    function getAllEventsByAddress(address wallet) external view returns (EventRecord[] memory results) {
        uint256[] storage idx = eventsByWallet[wallet];
        results = new EventRecord[](idx.length);
        for (uint256 i = 0; i < idx.length; i++) {
            results[i] = events[idx[i]];
        }
    }

    /**
     * @notice Return all recorded mint events across contracts.
     */
    function getAllMintedTokens() external view returns (EventRecord[] memory results) {
        uint256 count;
        for (uint256 i = 0; i < events.length; i++) {
            if (keccak256(bytes(events[i].eventType)) == keccak256("Mint")) {
                count++;
            }
        }
        results = new EventRecord[](count);
        uint256 j;
        for (uint256 i = 0; i < events.length; i++) {
            if (keccak256(bytes(events[i].eventType)) == keccak256("Mint")) {
                results[j++] = events[i];
            }
        }
    }

    /**
     * @notice Return all recorded burn events across contracts.
     */
    function getAllBurnedTokens() external view returns (EventRecord[] memory results) {
        uint256 count;
        for (uint256 i = 0; i < events.length; i++) {
            if (keccak256(bytes(events[i].eventType)) == keccak256("Burn")) {
                count++;
            }
        }
        results = new EventRecord[](count);
        uint256 j;
        for (uint256 i = 0; i < events.length; i++) {
            if (keccak256(bytes(events[i].eventType)) == keccak256("Burn")) {
                results[j++] = events[i];
            }
        }
    }

    /**
     * @notice Return all bridge transfers grouped by destination.
     */
    function getAllBridgedTransfers(string calldata destination) external view returns (BridgeTransfer[] memory results) {
        uint256[] storage idx = bridgedByNetwork[destination];
        results = new BridgeTransfer[](idx.length);
        for (uint256 i = 0; i < idx.length; i++) {
            results[i] = bridgeTransfers[idx[i]];
        }
    }

    /**
     * @notice Register the hash of an off-chain audit report.
     */
    function registerAuditReport(bytes32 reportHash, uint256 timestamp) external {
        emit AuditReportRegistered(reportHash, timestamp);
    }
}

