// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ConsensusEvidence
/// @notice Minimal on-chain registry of consensus proofs for blocks/batches/events.
contract ConsensusEvidence is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");

    enum ConsensusMode {
        POW,
        POA,
        BFT,
        OTHER
    }

    struct Evidence {
        bytes32 subjectId;
        ConsensusMode mode;
        bytes32 quorumHash;
        bytes32 signersHash;
        uint64 recordedAt;
        address recorder;
    }

    mapping(bytes32 => Evidence) private evidenceOf;

    event ConsensusEvidenceRecorded(
        bytes32 indexed subjectId,
        ConsensusMode mode,
        bytes32 quorumHash,
        bytes32 signersHash,
        address indexed recorder,
        uint64 recordedAt
    );

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(AUDITOR, COMPLIANCE_ADMIN);
    }

    modifier onlyRecorder() {
        require(hasRole(AUDITOR, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender), "not authorized");
        _;
    }

    function recordEvidence(bytes32 subjectId, ConsensusMode mode, bytes32 quorumHash, bytes32 signersHash)
        external
        onlyRecorder
    {
        require(subjectId != bytes32(0), "subjectId required");
        require(quorumHash != bytes32(0), "quorum hash required");
        require(signersHash != bytes32(0), "signers hash required");
        require(evidenceOf[subjectId].recordedAt == 0, "already recorded");
        evidenceOf[subjectId] = Evidence({
            subjectId: subjectId,
            mode: mode,
            quorumHash: quorumHash,
            signersHash: signersHash,
            recordedAt: uint64(block.timestamp),
            recorder: msg.sender
        });
        emit ConsensusEvidenceRecorded(subjectId, mode, quorumHash, signersHash, msg.sender, uint64(block.timestamp));
    }

    function getEvidence(bytes32 subjectId) external view returns (Evidence memory) {
        return evidenceOf[subjectId];
    }
}
