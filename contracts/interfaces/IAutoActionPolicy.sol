// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAutoActionPolicy {
    enum Severity {
        INFO,
        WARNING,
        CRITICAL
    }

    enum ActionType {
        NONE,
        ESCALATE_RISK
    }

    struct ActionPolicy {
        ActionType action;
        uint8 targetRiskLevel;
        uint64 validForSeconds;
        uint32 version;
        bytes32 policyHash;
        bool exists;
    }

    function activePolicy(Severity severity) external view returns (ActionPolicy memory);
}
