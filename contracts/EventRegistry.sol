// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title EventRegistry
/// @notice Anchors canonical event hashes (EID) with evidence hashes (VID) and lifecycle attest/verify flow.
contract EventRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant NOTARY = keccak256("NOTARY");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");

    enum EventStatus {
        NONE,
        CREATED,
        ATTESTED,
        VERIFIED,
        REJECTED
    }

    struct EventRecord {
        bytes32 eid;
        bytes32 eventType;
        uint64 createdAt;
        address creator;
        EventStatus status;
        bytes32 payloadHash;
        bytes32[] vids;
        uint32 attestCount;
        uint32 verifyCount;
    }

    mapping(bytes32 => EventRecord) private events;
    mapping(bytes32 => mapping(address => bool)) private attestedBy;
    mapping(bytes32 => mapping(address => bool)) private verifiedBy;
    mapping(bytes32 => bytes32) private rejectionReason;

    uint32 public minAttestations;
    uint32 public minVerifications;

    event EventCreated(bytes32 indexed eid, bytes32 indexed eventType, bytes32 payloadHash, address indexed creator);
    event EventAttested(bytes32 indexed eid, address indexed notary);
    event EventVerified(bytes32 indexed eid, address indexed verifier);
    event EventRejected(bytes32 indexed eid, bytes32 reasonHash, address indexed actor);
    event ThresholdsUpdated(uint32 minAttestations, uint32 minVerifications);

    constructor(address admin, uint32 minAttestations_, uint32 minVerifications_) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(NOTARY, admin);
        _grantRole(AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);
        _setRoleAdmin(NOTARY, COMPLIANCE_ADMIN);
        _setRoleAdmin(AUDITOR, COMPLIANCE_ADMIN);

        minAttestations = minAttestations_ == 0 ? 1 : minAttestations_;
        minVerifications = minVerifications_ == 0 ? 1 : minVerifications_;
        emit ThresholdsUpdated(minAttestations, minVerifications);
    }

    function setThresholds(uint32 minAttestations_, uint32 minVerifications_) external {
        require(
            hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender),
            "not authorized"
        );
        require(minAttestations_ > 0, "min attestations required");
        require(minVerifications_ > 0, "min verifications required");
        minAttestations = minAttestations_;
        minVerifications = minVerifications_;
        emit ThresholdsUpdated(minAttestations_, minVerifications_);
    }

    function createEvent(bytes32 eid, bytes32 eventType, bytes32 payloadHash, bytes32[] calldata vids) external {
        require(eid != bytes32(0), "eid required");
        require(eventType != bytes32(0), "eventType required");
        require(payloadHash != bytes32(0), "payload hash required");
        EventRecord storage record = events[eid];
        require(record.status == EventStatus.NONE, "event exists");

        record.eid = eid;
        record.eventType = eventType;
        record.createdAt = uint64(block.timestamp);
        record.creator = msg.sender;
        record.status = EventStatus.CREATED;
        record.payloadHash = payloadHash;
        for (uint256 i = 0; i < vids.length; i++) {
            record.vids.push(vids[i]);
        }

        emit EventCreated(eid, eventType, payloadHash, msg.sender);
    }

    function attestEvent(bytes32 eid) external {
        require(hasRole(NOTARY, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender), "not authorized");
        EventRecord storage record = events[eid];
        require(record.status == EventStatus.CREATED || record.status == EventStatus.ATTESTED, "invalid status");
        require(!attestedBy[eid][msg.sender], "already attested");
        require(record.status != EventStatus.REJECTED, "event rejected");

        attestedBy[eid][msg.sender] = true;
        record.attestCount += 1;
        record.status = EventStatus.ATTESTED;

        emit EventAttested(eid, msg.sender);
    }

    function verifyEvent(bytes32 eid) external {
        require(hasRole(AUDITOR, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender), "not authorized");
        EventRecord storage record = events[eid];
        require(record.status == EventStatus.ATTESTED, "not attested");
        require(record.attestCount >= minAttestations, "not enough attestations");
        require(!verifiedBy[eid][msg.sender], "already verified");

        verifiedBy[eid][msg.sender] = true;
        record.verifyCount += 1;

        if (record.verifyCount >= minVerifications) {
            record.status = EventStatus.VERIFIED;
        }

        emit EventVerified(eid, msg.sender);
    }

    function rejectEvent(bytes32 eid, bytes32 reasonHash) external {
        require(hasRole(AUDITOR, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender), "not authorized");
        EventRecord storage record = events[eid];
        require(record.status != EventStatus.NONE, "event missing");
        require(record.status != EventStatus.VERIFIED, "already verified");
        require(reasonHash != bytes32(0), "reason required");

        record.status = EventStatus.REJECTED;
        rejectionReason[eid] = reasonHash;
        emit EventRejected(eid, reasonHash, msg.sender);
    }

    function statusOf(bytes32 eid) external view returns (EventStatus) {
        return events[eid].status;
    }

    function rejectionReasonOf(bytes32 eid) external view returns (bytes32) {
        return rejectionReason[eid];
    }

    function getEvent(bytes32 eid) external view returns (EventRecord memory) {
        return events[eid];
    }
}
