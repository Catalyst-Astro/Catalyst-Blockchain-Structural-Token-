// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUBOComplianceGate {
    function validateWallet(address wallet) external view;
}
