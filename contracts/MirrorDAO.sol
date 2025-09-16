// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGovernanceSource {
    function getProposal(uint256 id) external view returns (
        address newProtocolAddress,
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed
    );
}

/// @title MirrorDAO
/// @notice DAO that mirrors decisions from another DAO with an ethical filter.
contract MirrorDAO {
    IGovernanceSource public immutable source;
    address public ethicsGuard;

    event MirrorReflected(uint256 indexed proposalId, bool executed);

    constructor(IGovernanceSource sourceDAO, address guard) {
        source = sourceDAO;
        ethicsGuard = guard;
    }

    /// @notice Execute a mirrored decision if allowed by the ethics guard.
    function mirrorExecute(uint256 proposalId, bool allowed) external {
        require(msg.sender == ethicsGuard, "guard only");
        (, uint256 forVotes, uint256 againstVotes, bool executed) = source.getProposal(proposalId);
        require(!executed, "already executed");
        bool success = false;
        if (allowed && forVotes > againstVotes) {
            success = true;
        }
        emit MirrorReflected(proposalId, success);
    }
}
