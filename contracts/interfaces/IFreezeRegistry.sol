// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFreezeRegistry {
    function isFrozenWallet(address wallet) external view returns (bool);
    function isFrozenSeries(bytes32 seriesId) external view returns (bool);
    function isFrozenFunction(bytes4 selector) external view returns (bool);
}
