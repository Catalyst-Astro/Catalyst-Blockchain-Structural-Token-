// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IWhitelistRegistry {
    function isWhitelisted(address account) external view returns (bool);
}
