// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICatalystStandardRegistry {
    function activeStandardVersion() external view returns (uint32);

    function isStandardActive(uint32 version) external view returns (bool);
}
