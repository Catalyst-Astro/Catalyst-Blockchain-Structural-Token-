// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWhitelistPolicy {
    function validateTransfer(
        address from,
        address to,
        uint256 amount,
        bytes32 assetType,
        bytes32 travelEvidenceId
    ) external view;
}
