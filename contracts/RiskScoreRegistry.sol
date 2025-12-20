// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IRiskScoreRegistry.sol";

/// @title RiskScoreRegistry
/// @notice Stores AML risk scores for wallets or entities without PII.
contract RiskScoreRegistry is AccessControl, IRiskScoreRegistry {
    bytes32 public constant RISK_ADMIN = keccak256("RISK_ADMIN");
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    struct Score {
        RiskLevel level;
        uint32 version;
        uint64 validFrom;
        uint64 validTo;
        bytes32 justificationHash;
        bool exists;
    }

    mapping(bytes32 => Score) private scores;

    event RiskScoreSet(
        bytes32 indexed subjectId,
        RiskLevel level,
        uint32 version,
        uint64 validFrom,
        uint64 validTo,
        bytes32 justificationHash
    );
    event RiskScoreUpdated(
        bytes32 indexed subjectId,
        RiskLevel level,
        uint32 version,
        uint64 validFrom,
        uint64 validTo,
        bytes32 justificationHash
    );
    event RiskScoreExpired(bytes32 indexed subjectId, uint64 expiredAt);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RISK_ADMIN, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(RISK_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(COMPLIANCE_ADMIN, RISK_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);
    }

    function setWalletScore(
        address wallet,
        RiskLevel level,
        uint32 version,
        uint64 validFrom,
        uint64 validTo,
        bytes32 justificationHash
    ) external {
        require(wallet != address(0), "wallet required");
        _requireRiskOperator();
        _setScore(walletToSubjectId(wallet), level, version, validFrom, validTo, justificationHash);
    }

    function setEntityScore(
        bytes32 entityId,
        RiskLevel level,
        uint32 version,
        uint64 validFrom,
        uint64 validTo,
        bytes32 justificationHash
    ) external {
        _requireRiskOperator();
        _setScore(entityId, level, version, validFrom, validTo, justificationHash);
    }

    function expireScore(bytes32 subjectId) external {
        _requireRiskOperator();
        Score storage score = scores[subjectId];
        require(score.exists, "score missing");
        score.validTo = uint64(block.timestamp);
        emit RiskScoreExpired(subjectId, score.validTo);
    }

    function scoreOfSubject(bytes32 subjectId)
        external
        view
        returns (RiskLevel level, uint32 version, uint64 validFrom, uint64 validTo, bytes32 justificationHash)
    {
        Score storage score = scores[subjectId];
        return (score.level, score.version, score.validFrom, score.validTo, score.justificationHash);
    }

    function scoreOfWallet(address wallet)
        external
        view
        returns (RiskLevel level, uint32 version, uint64 validFrom, uint64 validTo, bytes32 justificationHash)
    {
        Score storage score = scores[walletToSubjectId(wallet)];
        return (score.level, score.version, score.validFrom, score.validTo, score.justificationHash);
    }

    function scoreOfEntity(bytes32 entityId)
        external
        view
        returns (RiskLevel level, uint32 version, uint64 validFrom, uint64 validTo, bytes32 justificationHash)
    {
        Score storage score = scores[entityId];
        return (score.level, score.version, score.validFrom, score.validTo, score.justificationHash);
    }

    function isScoreActiveSubject(bytes32 subjectId) external view returns (bool) {
        return _isActive(scores[subjectId]);
    }

    function isScoreActiveWallet(address wallet) external view returns (bool) {
        return _isActive(scores[walletToSubjectId(wallet)]);
    }

    function isScoreActiveEntity(bytes32 entityId) external view returns (bool) {
        return _isActive(scores[entityId]);
    }

    function walletToSubjectId(address wallet) public pure returns (bytes32) {
        return bytes32(uint256(uint160(wallet)));
    }

    function _setScore(
        bytes32 subjectId,
        RiskLevel level,
        uint32 version,
        uint64 validFrom,
        uint64 validTo,
        bytes32 justificationHash
    ) internal {
        require(subjectId != bytes32(0), "subject required");
        uint64 effectiveFrom = validFrom == 0 ? uint64(block.timestamp) : validFrom;
        if (validTo != 0) {
            require(validTo > effectiveFrom, "invalid validity");
        }
        Score storage current = scores[subjectId];
        bool isNew = !current.exists;
        scores[subjectId] = Score({
            level: level,
            version: version,
            validFrom: effectiveFrom,
            validTo: validTo,
            justificationHash: justificationHash,
            exists: true
        });
        if (isNew) {
            emit RiskScoreSet(subjectId, level, version, effectiveFrom, validTo, justificationHash);
        } else {
            emit RiskScoreUpdated(subjectId, level, version, effectiveFrom, validTo, justificationHash);
        }
    }

    function _isActive(Score storage score) internal view returns (bool) {
        if (!score.exists) {
            return false;
        }
        if (score.validFrom != 0 && block.timestamp < score.validFrom) {
            return false;
        }
        if (score.validTo != 0 && block.timestamp > score.validTo) {
            return false;
        }
        return true;
    }

    function _requireRiskOperator() internal view {
        require(
            hasRole(RISK_ADMIN, msg.sender) || hasRole(COMPLIANCE_ADMIN, msg.sender) || hasRole(DAO_COUNCIL, msg.sender),
            "not authorized"
        );
    }
}
