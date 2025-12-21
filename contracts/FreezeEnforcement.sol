// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFreezeRegistry.sol";

/// @title FreezeEnforcement
/// @notice Reusable freeze enforcement helpers for wallets, series, and functions.
library FreezeEnforcement {
    function requireNotFrozenWallet(IFreezeRegistry registry, address wallet) internal view {
        if (wallet == address(0)) {
            return;
        }
        require(address(registry) != address(0), "freeze registry not set");
        require(!registry.isFrozenWallet(wallet), "wallet frozen");
    }

    function requireNotFrozenSeries(IFreezeRegistry registry, bytes32 seriesId) internal view {
        if (seriesId == bytes32(0)) {
            return;
        }
        require(address(registry) != address(0), "freeze registry not set");
        require(!registry.isFrozenSeries(seriesId), "series frozen");
    }

    function requireNotFrozenFunction(IFreezeRegistry registry, bytes4 selector) internal view {
        if (selector == bytes4(0)) {
            return;
        }
        require(address(registry) != address(0), "freeze registry not set");
        require(!registry.isFrozenFunction(selector), "function frozen");
    }
}
