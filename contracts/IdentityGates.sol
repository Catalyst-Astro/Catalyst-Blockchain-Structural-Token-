// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IIdentitySBT.sol";
import "./interfaces/IIdentityPolicyRegistry.sol";

/// @title IdentityGates
/// @notice Reusable SBT identity checks for transfers and gated actions.
library IdentityGates {
    function requireValidIdentity(IIdentitySBT sbt, address wallet) internal view {
        if (wallet == address(0)) {
            return;
        }
        require(address(sbt) != address(0), "identity SBT not set");
        require(sbt.isIdentityValid(wallet), "identity invalid");
    }

    function requireKycLevel(IIdentitySBT sbt, address wallet, uint8 minLevel) internal view {
        if (wallet == address(0) || minLevel == 0) {
            return;
        }
        (, uint8 kycLevel, , , ) = sbt.identityInfo(wallet);
        require(kycLevel >= minLevel, "kyc level too low");
    }

    function requireUserType(IIdentitySBT sbt, address wallet, uint256 allowedMask) internal view {
        if (wallet == address(0) || allowedMask == 0) {
            return;
        }
        (uint8 userType, , , , ) = sbt.identityInfo(wallet);
        require((allowedMask & (1 << userType)) != 0, "user type not allowed");
    }

    function enforceTransfer(
        IIdentitySBT sbt,
        IIdentityPolicyRegistry policyRegistry,
        address from,
        address to
    ) internal view {
        requireValidIdentity(sbt, from);
        requireValidIdentity(sbt, to);

        if (address(policyRegistry) == address(0)) {
            return;
        }

        IIdentityPolicyRegistry.Policy memory policy = policyRegistry.activePolicy();
        if (!policy.exists) {
            return;
        }

        requireKycLevel(sbt, from, policy.minKycForTransfer);
        requireKycLevel(sbt, to, policy.minKycForReceive);
        requireUserType(sbt, from, policy.allowedUserTypesMask);
        requireUserType(sbt, to, policy.allowedUserTypesMask);
    }
}
