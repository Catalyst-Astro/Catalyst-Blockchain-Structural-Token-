// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRiskScoreRegistry {
    enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH
    }

    function setWalletScore(
        address wallet,
        RiskLevel level,
        uint32 version,
        uint64 validFrom,
        uint64 validTo,
        bytes32 justificationHash
    ) external;

    function setEntityScore(
        bytes32 entityId,
        RiskLevel level,
        uint32 version,
        uint64 validFrom,
        uint64 validTo,
        bytes32 justificationHash
    ) external;

    function scoreOfSubject(bytes32 subjectId)
        external
        view
        returns (RiskLevel level, uint32 version, uint64 validFrom, uint64 validTo, bytes32 justificationHash);

    function scoreOfWallet(address wallet)
        external
        view
        returns (RiskLevel level, uint32 version, uint64 validFrom, uint64 validTo, bytes32 justificationHash);

    function scoreOfEntity(bytes32 entityId)
        external
        view
        returns (RiskLevel level, uint32 version, uint64 validFrom, uint64 validTo, bytes32 justificationHash);

    function isScoreActiveSubject(bytes32 subjectId) external view returns (bool);
    function isScoreActiveWallet(address wallet) external view returns (bool);
    function isScoreActiveEntity(bytes32 entityId) external view returns (bool);

    function walletToSubjectId(address wallet) external pure returns (bytes32);
}
