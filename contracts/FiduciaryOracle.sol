// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/ITrustRegistry.sol";

/// @title FiduciaryOracle
/// @notice Reports real-world revenues and legal events from a fiduciary source.
contract FiduciaryOracle is AccessControl {
    bytes32 public constant FIDUCIARY_ORACLE = keccak256("FIDUCIARY_ORACLE");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant DISTRIBUTION_AUTHORIZER = keccak256("DISTRIBUTION_AUTHORIZER");

    bytes32 public constant LEGAL_HOLD = keccak256("LEGAL_HOLD");
    bytes32 public constant LEGAL_RELEASE = keccak256("LEGAL_RELEASE");

    struct RevenueRecord {
        bytes32 trustId;
        uint256 amount;
        bytes32 evidenceHash;
        uint64 timestamp;
        address reporter;
    }

    struct LegalEvent {
        bytes32 eventType;
        bytes32 evidenceHash;
        uint64 timestamp;
        bool holdActive;
    }

    ITrustRegistry public trustRegistry;
    mapping(bytes32 => RevenueRecord) private revenueRecords;
    mapping(bytes32 => uint256) private availableRevenue;
    mapping(bytes32 => LegalEvent) private lastLegalEvent;
    mapping(bytes32 => bool) private legalHold;

    event RevenueReported(bytes32 indexed trustId, bytes32 indexed revenueId, uint256 amount, bytes32 evidenceHash);
    event RevenueConsumed(bytes32 indexed trustId, uint256 amount, uint256 remaining);
    event LegalEventReported(
        bytes32 indexed trustId,
        bytes32 indexed eventType,
        bytes32 evidenceHash,
        bool holdActive
    );

    constructor(address admin, address trustRegistry_) {
        require(admin != address(0), "admin required");
        require(trustRegistry_ != address(0), "trust registry required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FIDUCIARY_ORACLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(DISTRIBUTION_AUTHORIZER, admin);
        _setRoleAdmin(FIDUCIARY_ORACLE, COMPLIANCE_ADMIN);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DISTRIBUTION_AUTHORIZER, COMPLIANCE_ADMIN);

        trustRegistry = ITrustRegistry(trustRegistry_);
    }

    function setTrustRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        require(registry != address(0), "trust registry required");
        trustRegistry = ITrustRegistry(registry);
    }

    function reportRevenue(bytes32 trustId, uint256 amount, bytes32 evidenceHash)
        external
        onlyRole(FIDUCIARY_ORACLE)
        returns (bytes32 revenueId)
    {
        require(trustId != bytes32(0), "trust id required");
        require(trustRegistry.trustExists(trustId), "trust missing");
        require(amount > 0, "amount required");
        require(evidenceHash != bytes32(0), "evidence hash required");

        revenueId = keccak256(abi.encodePacked(trustId, amount, evidenceHash, block.timestamp, msg.sender));
        revenueRecords[revenueId] = RevenueRecord({
            trustId: trustId,
            amount: amount,
            evidenceHash: evidenceHash,
            timestamp: uint64(block.timestamp),
            reporter: msg.sender
        });
        availableRevenue[trustId] += amount;
        emit RevenueReported(trustId, revenueId, amount, evidenceHash);
    }

    function reportLegalEvent(bytes32 trustId, bytes32 eventType, bytes32 evidenceHash)
        external
        onlyRole(FIDUCIARY_ORACLE)
    {
        require(trustId != bytes32(0), "trust id required");
        require(trustRegistry.trustExists(trustId), "trust missing");
        require(eventType != bytes32(0), "event type required");
        require(evidenceHash != bytes32(0), "evidence hash required");

        if (eventType == LEGAL_HOLD) {
            legalHold[trustId] = true;
        } else if (eventType == LEGAL_RELEASE) {
            legalHold[trustId] = false;
        }

        lastLegalEvent[trustId] = LegalEvent({
            eventType: eventType,
            evidenceHash: evidenceHash,
            timestamp: uint64(block.timestamp),
            holdActive: legalHold[trustId]
        });
        emit LegalEventReported(trustId, eventType, evidenceHash, legalHold[trustId]);
    }

    function consumeRevenue(bytes32 trustId, uint256 amount) external {
        require(
            hasRole(DISTRIBUTION_AUTHORIZER, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender),
            "not authorized"
        );
        require(trustId != bytes32(0), "trust id required");
        require(amount > 0, "amount required");
        require(availableRevenue[trustId] >= amount, "insufficient revenue");
        availableRevenue[trustId] -= amount;
        emit RevenueConsumed(trustId, amount, availableRevenue[trustId]);
    }

    function availableRevenueOf(bytes32 trustId) external view returns (uint256) {
        return availableRevenue[trustId];
    }

    function legalHoldActive(bytes32 trustId) external view returns (bool) {
        return legalHold[trustId];
    }

    function lastLegalEventOf(bytes32 trustId) external view returns (LegalEvent memory) {
        return lastLegalEvent[trustId];
    }

    function revenueRecord(bytes32 revenueId) external view returns (RevenueRecord memory) {
        return revenueRecords[revenueId];
    }
}
