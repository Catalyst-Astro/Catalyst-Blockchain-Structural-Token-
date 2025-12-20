// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWalletJurisdictionRegistry {
    function jurisdictionOf(address wallet) external view returns (bytes32);
}
