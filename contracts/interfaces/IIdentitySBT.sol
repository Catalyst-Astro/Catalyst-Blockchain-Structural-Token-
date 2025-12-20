// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentitySBT {
    enum Status {
        NONE,
        ACTIVE,
        SUSPENDED,
        REVOKED,
        EXPIRED
    }

    function isIdentityValid(address wallet) external view returns (bool);

    function identityInfo(address wallet)
        external
        view
        returns (
            uint8 userTypeCode,
            uint8 kycLevelCode,
            Status status,
            uint64 validUntil,
            bytes32 attestationHash
        );
}
