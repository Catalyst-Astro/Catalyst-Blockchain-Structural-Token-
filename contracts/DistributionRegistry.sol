// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/ITrustRegistry.sol";

/**
 * @title DistributionRegistry
 * @notice Records distribution periods and hashes for auditable evidence.
 * @dev Amounts are recorded in USDC units of account with no transfers.
 */
contract DistributionRegistry is AccessControl {
    bytes32 public constant TRUST_ADMIN_ROLE = keccak256("TRUST_ADMIN");
    bytes32 public constant LEGAL_AUDITOR_ROLE = keccak256("LEGAL_AUDITOR");
    bytes32 public constant ORACLE_OPERATOR_ROLE = keccak256("ORACLE_OPERATOR");
    bytes32 public constant DAO_COUNCIL_ROLE = keccak256("DAO_COUNCIL");

    enum PeriodStatus {
        NONE,
        OPEN,
        CLOSED,
        RECORDED
    }

    struct DistributionPeriod {
        bytes32 periodId;
        bytes32 trustId;
        bytes32 seriesId;
        uint16 year;
        uint8 month;
        uint64 openedAt;
        uint64 closedAt;
        uint64 recordedAt;
        uint256 distributableUSDC;
        bytes32 rulesHash;
        bytes32 calculationHash;
        PeriodStatus status;
    }

    mapping(bytes32 => DistributionPeriod) private periods;

    address public trustRegistry;

    event PeriodOpened(
        bytes32 indexed periodId,
        bytes32 indexed trustId,
        bytes32 indexed seriesId,
        uint16 year,
        uint8 month
    );

    event PeriodClosed(bytes32 indexed periodId, uint64 closedAt);

    event DistributionRecorded(
        bytes32 indexed periodId,
        uint256 distributableUSDC,
        bytes32 rulesHash,
        bytes32 calculationHash
    );

    constructor(address admin, address trustRegistry_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TRUST_ADMIN_ROLE, admin);

        _setRoleAdmin(LEGAL_AUDITOR_ROLE, TRUST_ADMIN_ROLE);
        _setRoleAdmin(ORACLE_OPERATOR_ROLE, TRUST_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL_ROLE, TRUST_ADMIN_ROLE);

        trustRegistry = trustRegistry_;
    }

    function setTrustRegistry(address newRegistry) external onlyRole(TRUST_ADMIN_ROLE) {
        trustRegistry = newRegistry;
    }

    function computePeriodId(
        bytes32 trustId,
        bytes32 seriesId,
        uint16 year,
        uint8 month
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(trustId, seriesId, year, month));
    }

    function openPeriod(
        bytes32 trustId,
        bytes32 seriesId,
        uint16 year,
        uint8 month
    ) external returns (bytes32) {
        _requireAdminOrCouncil();
        require(month >= 1 && month <= 12, "invalid month");
        if (trustRegistry != address(0)) {
            require(ITrustRegistry(trustRegistry).trustExists(trustId), "unknown trust");
        }

        bytes32 periodId = computePeriodId(trustId, seriesId, year, month);
        require(periods[periodId].status == PeriodStatus.NONE, "period exists");

        periods[periodId] = DistributionPeriod({
            periodId: periodId,
            trustId: trustId,
            seriesId: seriesId,
            year: year,
            month: month,
            openedAt: uint64(block.timestamp),
            closedAt: 0,
            recordedAt: 0,
            distributableUSDC: 0,
            rulesHash: bytes32(0),
            calculationHash: bytes32(0),
            status: PeriodStatus.OPEN
        });

        emit PeriodOpened(periodId, trustId, seriesId, year, month);
        return periodId;
    }

    function closePeriod(bytes32 periodId) external {
        _requireAdminOrCouncil();
        DistributionPeriod storage period = periods[periodId];
        require(period.status == PeriodStatus.OPEN, "period not open");
        period.status = PeriodStatus.CLOSED;
        period.closedAt = uint64(block.timestamp);
        emit PeriodClosed(periodId, period.closedAt);
    }

    function recordDistribution(
        bytes32 periodId,
        uint256 distributableUSDC,
        bytes32 rulesHash,
        bytes32 calculationHash
    ) external {
        _requireAdminOrOracle();
        DistributionPeriod storage period = periods[periodId];
        require(period.status == PeriodStatus.CLOSED, "period not closed");
        period.distributableUSDC = distributableUSDC;
        period.rulesHash = rulesHash;
        period.calculationHash = calculationHash;
        period.recordedAt = uint64(block.timestamp);
        period.status = PeriodStatus.RECORDED;
        emit DistributionRecorded(periodId, distributableUSDC, rulesHash, calculationHash);
    }

    function getPeriod(bytes32 periodId) external view returns (DistributionPeriod memory) {
        return periods[periodId];
    }

    function _requireAdminOrCouncil() internal view {
        require(
            hasRole(TRUST_ADMIN_ROLE, msg.sender) || hasRole(DAO_COUNCIL_ROLE, msg.sender),
            "missing admin or council role"
        );
    }

    function _requireAdminOrOracle() internal view {
        require(
            hasRole(TRUST_ADMIN_ROLE, msg.sender) || hasRole(ORACLE_OPERATOR_ROLE, msg.sender),
            "missing admin or oracle role"
        );
    }
}
