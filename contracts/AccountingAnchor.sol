// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AccountingAnchor
/// @notice Ancla contable on-chain: guarda el hash SHA-256 de cada cierre contable diario.
/// @dev Vincula la contabilidad off-chain (NIF) con el registro on-chain inmutable.
///      Catalyst Blockchain Labs S.A. de C.V. — P13 Daily Close Protocol.
contract AccountingAnchor is AccessControl {
    bytes32 public constant ACCOUNTANT_ROLE = keccak256("ACCOUNTANT_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    struct DailyAnchor {
        bytes32 closureHash;       // SHA-256 de todas las cuentas en el cierre
        bytes32 trialBalanceHash;  // SHA-256 de la balanza de comprobación
        uint256 accountCount;      // Número de cuentas activas en el cierre
        uint256 totalDebit;        // Total débitos (debe igualar totalCredit)
        uint256 totalCredit;       // Total créditos
        uint64  timestamp;         // Timestamp del bloque
    }

    /// dayIdx = days since 2026-06-17 (epoch)
    mapping(uint64 => DailyAnchor) public anchors;

    /// Total anchors registered
    uint64 public totalAnchors;

    /// Emitted when a new daily accounting closure is anchored
    event AccountingAnchored(
        uint64 indexed dayIdx,
        bytes32 closureHash,
        uint256 accountCount,
        uint256 totalDebit,
        uint256 totalCredit
    );

    /// Emitted when an anchor is verified by an auditor
    event AnchorVerified(uint64 indexed dayIdx, address indexed auditor);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ACCOUNTANT_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);
    }

    /// @notice Anchors a daily accounting closure on-chain.
    /// @param dayIdx Days since epoch 2026-06-17
    /// @param closureHash SHA-256 of all account closing balances
    /// @param trialBalanceHash SHA-256 of the trial balance
    /// @param accountCount Number of active accounts
    /// @param totalDebit Sum of all debit balances (scaled by 10^4)
    /// @param totalCredit Sum of all credit balances (scaled by 10^4)
    function anchor(
        uint64  dayIdx,
        bytes32 closureHash,
        bytes32 trialBalanceHash,
        uint256 accountCount,
        uint256 totalDebit,
        uint256 totalCredit
    ) external onlyRole(ACCOUNTANT_ROLE) {
        require(anchors[dayIdx].timestamp == 0, "Day already anchored");

        anchors[dayIdx] = DailyAnchor({
            closureHash: closureHash,
            trialBalanceHash: trialBalanceHash,
            accountCount: accountCount,
            totalDebit: totalDebit,
            totalCredit: totalCredit,
            timestamp: uint64(block.timestamp)
        });

        totalAnchors++;
        emit AccountingAnchored(dayIdx, closureHash, accountCount, totalDebit, totalCredit);
    }

    /// @notice Get a daily anchor by index.
    function getAnchor(uint64 dayIdx) external view returns (DailyAnchor memory) {
        return anchors[dayIdx];
    }

    /// @notice Get the latest N anchors.
    function getLatestAnchors(uint64 count) external view returns (DailyAnchor[] memory) {
        uint64 limit = count > totalAnchors ? totalAnchors : count;
        DailyAnchor[] memory result = new DailyAnchor[](limit);
        uint64 idx = totalAnchors;
        for (uint64 i = 0; i < limit; i++) {
            idx--;
            result[i] = anchors[idx];
        }
        return result;
    }

    /// @notice Verify that an off-chain closure hash matches the on-chain record.
    function verifyClosure(uint64 dayIdx, bytes32 offchainHash) external view returns (bool) {
        DailyAnchor memory a = anchors[dayIdx];
        require(a.timestamp != 0, "Day not anchored");
        return a.closureHash == offchainHash;
    }

    /// @notice Auditor marks an anchor as verified.
    function verify(uint64 dayIdx) external onlyRole(AUDITOR_ROLE) {
        require(anchors[dayIdx].timestamp != 0, "Day not anchored");
        emit AnchorVerified(dayIdx, msg.sender);
    }

    /// @notice Compute day index from a date (days since 2026-06-17).
    /// @dev Off-chain helper — used for consistency.
    function dayIndex(uint256 year, uint256 month, uint256 day) external pure returns (uint64) {
        // Simplified: days since 2026-06-17
        // 2026-06-17 = day 0
        uint256 y = year - 2026;
        uint256 m = month;
        uint256 d = day;

        // Days per month from June 2026
        uint256[12] memory daysInMonth = [
            uint256(30), 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31
        ];

        uint256 totalDays = 0;

        // Count full years
        for (uint256 i = 0; i < y; i++) {
            totalDays += 365;
        }

        // Count months in current year (starting from June = month 6)
        for (uint256 i = 6; i < m; i++) {
            totalDays += daysInMonth[i - 1];
        }

        totalDays += d - 17; // Days since June 17

        return uint64(totalDays);
    }
}
