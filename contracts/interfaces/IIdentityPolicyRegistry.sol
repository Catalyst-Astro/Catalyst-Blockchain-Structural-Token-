// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentityPolicyRegistry {
    struct Policy {
        uint8 minKycForTransfer;
        uint8 minKycForReceive;
        uint8 minKycForClaim;
        uint8 minKycForVote;
        uint256 allowedUserTypesMask;
        uint32 version;
        bytes32 policyHash;
        bool exists;
    }

    function activePolicy() external view returns (Policy memory);
    function activePolicyVersion() external view returns (uint32);
}
