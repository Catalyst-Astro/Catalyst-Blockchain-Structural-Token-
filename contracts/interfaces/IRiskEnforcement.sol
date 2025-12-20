// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRiskEnforcement {
    function checkLimits(address wallet, uint256 action, uint256 amount) external view;

    function consumeQuota(address wallet, uint256 action, uint256 amount) external;
}
