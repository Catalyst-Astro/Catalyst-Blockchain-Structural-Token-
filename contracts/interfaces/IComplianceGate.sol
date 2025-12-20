// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IComplianceGate {
    function validate(address wallet) external view;
}
