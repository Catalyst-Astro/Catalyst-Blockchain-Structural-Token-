// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPrivateOfferingRegistry {
    function isActive(bytes32 offeringId) external view returns (bool);
    function isJurisdictionAllowed(bytes32 offeringId, bytes32 jurisdiction) external view returns (bool);
}
