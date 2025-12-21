// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ComplianceTypes.sol";

/// @title ComplianceVotingPolicy
/// @notice Versioned voting rules for compliance DAO proposals.
contract ComplianceVotingPolicy is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct PolicyConfig {
        uint16 quorumBps;
        uint16 approvalBps;
        uint64 votingPeriodBlocks;
        bytes32 voterRole;
        bool exists;
    }

    struct PolicyVersion {
        bytes32 policyHash;
        uint32 version;
        bool exists;
    }

    mapping(uint32 => PolicyVersion) private versions;
    mapping(uint32 => mapping(ProposalType => PolicyConfig)) private configs;
    uint32 private activeVersion;
    uint32 private nextVersion;

    event VotingPolicyPublished(uint32 version, bytes32 policyHash);
    event VotingPolicyActivated(uint32 version);
    event VotingPolicyConfigured(
        uint32 version,
        ProposalType proposalType,
        uint16 quorumBps,
        uint16 approvalBps,
        uint64 votingPeriodBlocks,
        bytes32 voterRole
    );

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function publishPolicy(bytes32 policyHash) external onlyRole(COMPLIANCE_ADMIN) returns (uint32 version) {
        require(policyHash != bytes32(0), "policy hash required");
        version = nextVersion + 1;
        nextVersion = version;
        versions[version] = PolicyVersion({policyHash: policyHash, version: version, exists: true});
        emit VotingPolicyPublished(version, policyHash);
    }

    function activatePolicy(uint32 version) external onlyRole(DAO_COUNCIL) {
        require(versions[version].exists, "policy missing");
        activeVersion = version;
        emit VotingPolicyActivated(version);
    }

    function setPolicyForType(
        uint32 version,
        ProposalType proposalType,
        uint16 quorumBps,
        uint16 approvalBps,
        uint64 votingPeriodBlocks,
        bytes32 voterRole
    ) external onlyRole(COMPLIANCE_ADMIN) {
        require(versions[version].exists, "policy missing");
        require(quorumBps <= 10000 && approvalBps <= 10000, "invalid bps");
        require(voterRole != bytes32(0), "voter role required");
        require(votingPeriodBlocks > 0, "voting period required");

        configs[version][proposalType] = PolicyConfig({
            quorumBps: quorumBps,
            approvalBps: approvalBps,
            votingPeriodBlocks: votingPeriodBlocks,
            voterRole: voterRole,
            exists: true
        });
        emit VotingPolicyConfigured(version, proposalType, quorumBps, approvalBps, votingPeriodBlocks, voterRole);
    }

    function activePolicyVersion() external view returns (uint32) {
        return activeVersion;
    }

    function policyVersion(uint32 version) external view returns (PolicyVersion memory) {
        return versions[version];
    }

    function policyForType(uint32 version, ProposalType proposalType) external view returns (PolicyConfig memory) {
        return configs[version][proposalType];
    }

    function activePolicyForType(ProposalType proposalType) external view returns (PolicyConfig memory) {
        return configs[activeVersion][proposalType];
    }
}
