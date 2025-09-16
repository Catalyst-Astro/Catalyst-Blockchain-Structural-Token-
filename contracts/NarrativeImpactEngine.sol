// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title NarrativeImpactEngine
 * @dev Collects project events and generates hashed narrative summaries.
 */
contract NarrativeImpactEngine {
    struct Report {
        uint256 projectId;
        bytes32 narrativeHash;
        string format;
    }

    event ImpactEventLogged(uint256 indexed projectId, string eventType, string data);
    event NarrativeHashGenerated(uint256 indexed projectId, bytes32 narrativeHash, string format);

    Report[] private reports;

    /**
     * @dev Log an impact-related event.
     */
    function logImpactEvent(uint256 projectId, string calldata eventType, string calldata data) external {
        emit ImpactEventLogged(projectId, eventType, data);
    }

    /**
     * @dev Generate a narrative hash for a project in a given format.
     */
    function generateImpactReport(uint256 projectId, string calldata format) external returns (bytes32) {
        bytes32 hash = keccak256(abi.encodePacked(projectId, format, block.timestamp));
        reports.push(Report({projectId: projectId, narrativeHash: hash, format: format}));
        emit NarrativeHashGenerated(projectId, hash, format);
        return hash;
    }

    /**
     * @dev Retrieve a stored report.
     */
    function getReport(uint256 index) external view returns (uint256 projectId, bytes32 narrativeHash, string memory format) {
        Report storage r = reports[index];
        return (r.projectId, r.narrativeHash, r.format);
    }

    function reportsCount() external view returns (uint256) {
        return reports.length;
    }
}
