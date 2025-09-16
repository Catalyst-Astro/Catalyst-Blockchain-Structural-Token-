// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ITenderAuditable
/// @notice Interface to record audit scores and KPI compliance for tenders
interface ITenderAuditable {
    function recordAudit(uint256 tenderId, uint8 score) external;
    function recordKpi(uint256 tenderId, bytes32 kpiId, bool compliant) external;
}
