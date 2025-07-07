// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IGovernanceControl
/// @notice Interface for checking governance roles in FractalDAO.
interface IGovernanceControl {
    function isGuardian(address account) external view returns (bool);
    function isCouncilSigner(address account) external view returns (bool);
}
