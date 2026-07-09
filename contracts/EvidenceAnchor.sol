// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title EvidenceAnchor
/// @notice Anchors arbitrary hashes (EID/VID/RID/etc.) on-chain without storing PII.
contract EvidenceAnchor is AccessControl {
    enum AnchorType {
        EVENT,
        EVIDENCE,
        REPORT,
        POLICY,
        OTHER
    }

    struct Anchor {
        bytes32 hash;
        AnchorType aType;
        bytes32 refId;
        address actor;
        uint64 anchoredAt;
    }

    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");

    mapping(bytes32 => Anchor) private anchors;

    event HashAnchored(bytes32 indexed hash, AnchorType indexed aType, bytes32 indexed refId, address actor, uint64 anchoredAt);
    event BatchAnchored(uint256 count, AnchorType indexed aType, bytes32 indexed refId, address actor, uint64 anchoredAt);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(AUDITOR, COMPLIANCE_ADMIN);
    }

    modifier onlyAnchors() {
        require(hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(AUDITOR, msg.sender), "not authorized");
        _;
    }

    function anchorHash(bytes32 hash, AnchorType aType, bytes32 refId) public onlyAnchors {
        require(hash != bytes32(0), "hash required");
        require(anchors[hash].anchoredAt == 0, "already anchored");
        anchors[hash] = Anchor({
            hash: hash,
            aType: aType,
            refId: refId,
            actor: msg.sender,
            anchoredAt: uint64(block.timestamp)
        });
        emit HashAnchored(hash, aType, refId, msg.sender, uint64(block.timestamp));
    }

    function anchorBatch(bytes32[] calldata hashes, AnchorType aType, bytes32 refId) external onlyAnchors {
        uint256 len = hashes.length;
        require(len > 0, "empty batch");
        for (uint256 i = 0; i < len; i++) {
            anchorHash(hashes[i], aType, refId);
        }
        emit BatchAnchored(len, aType, refId, msg.sender, uint64(block.timestamp));
    }

    function exists(bytes32 hash) external view returns (bool) {
        return anchors[hash].anchoredAt != 0;
    }

    function getAnchor(bytes32 hash) external view returns (Anchor memory) {
        return anchors[hash];
    }
}
