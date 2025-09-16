// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TemporalLogic.sol";
import "./CustodianDAO.sol";
import "./MirrorDAO.sol";
import "./interfaces/ISpiralAware.sol";

/// @title SpiralGovernanceEngine
/// @notice Core engine enabling cyclical governance and mirrored decisions.
contract SpiralGovernanceEngine {
    using TemporalLogic for uint256;

    enum CycleType { LUNAR, SOLAR, ESTACIONAL, PERSONALIZADO }

    struct CycleRule {
        CycleType cycleType;
        uint256 start;
        uint256 end;
        bytes32 contextRequirement;
    }

    uint256 public cycleCount;
    mapping(uint256 => CycleRule) public cycles;

    CustodianDAO public custodian;
    MirrorDAO public mirror;

    event CycleValidated(uint256 indexed cycleId, bool valid);

    constructor(CustodianDAO custodianDAO, MirrorDAO mirrorDAO) {
        custodian = custodianDAO;
        mirror = mirrorDAO;
    }

    /// @notice Register a new cyclical governance rule.
    function registerCycle(
        CycleType cycleType,
        uint256 start,
        uint256 end,
        bytes32 contextRequirement
    ) external returns (uint256) {
        cycles[cycleCount] = CycleRule(cycleType, start, end, contextRequirement);
        cycleCount += 1;
        return cycleCount - 1;
    }

    /// @notice Validate if a proposal is within the activation window of a cycle.
    function validateProposalByCycle(uint256 cycleId) external returns (bool) {
        CycleRule storage c = cycles[cycleId];
        bool valid = TemporalLogic.within(c.start, c.end);
        emit CycleValidated(cycleId, valid);
        return valid;
    }

    /// @notice Forward a custodial vote to the CustodianDAO.
    function custodialVote(uint256 proposalId, bool approve) external {
        custodian.custodialVote(proposalId, approve);
    }

    /// @notice Execute a mirrored decision through the MirrorDAO.
    function mirrorExecute(uint256 proposalId, bool allowed) external {
        mirror.mirrorExecute(proposalId, allowed);
    }
}
