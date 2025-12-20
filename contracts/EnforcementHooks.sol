// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IWhitelistRegistry.sol";
import "./interfaces/IWhitelistPolicy.sol";

/// @title EnforcementHooks
/// @notice Reusable whitelist enforcement helpers.
library EnforcementHooks {
    function requireWhitelisted(IWhitelistRegistry registry, address account) internal view {
        if (account == address(0)) {
            return;
        }
        require(address(registry) != address(0), "whitelist registry not set");
        require(registry.isWhitelisted(account), "wallet not whitelisted");
    }

    function requireWhitelistedBoth(IWhitelistRegistry registry, address from, address to) internal view {
        requireWhitelisted(registry, from);
        requireWhitelisted(registry, to);
    }

    function enforcePolicy(
        IWhitelistPolicy policy,
        address from,
        address to,
        uint256 amount,
        bytes32 assetType,
        bytes32 travelEvidenceId
    ) internal view {
        if (address(policy) == address(0)) {
            return;
        }
        policy.validateTransfer(from, to, amount, assetType, travelEvidenceId);
    }
}
