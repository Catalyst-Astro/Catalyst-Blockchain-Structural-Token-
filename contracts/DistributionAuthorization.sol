// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/ITrustRegistry.sol";
import "./FiduciaryOracle.sol";
import "./interfaces/IFreezeRegistry.sol";

/// @title DistributionAuthorization
/// @notice Authorizes on-chain distributions only when fiduciary conditions are met.
contract DistributionAuthorization is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");

    enum BlockReason {
        NONE,
        TRUST_MISSING,
        LEGAL_HOLD,
        INSUFFICIENT_REVENUE,
        FREEZE_ACTIVE
    }

    ITrustRegistry public trustRegistry;
    FiduciaryOracle public fiduciaryOracle;
    IFreezeRegistry public freezeRegistry;

    mapping(bytes32 => bytes32) private trustSeries;

    event DistributionAuthorized(bytes32 indexed trustId, uint256 amount, uint256 remaining);
    event DistributionBlocked(bytes32 indexed trustId, uint256 amount, BlockReason reason);
    event TrustRegistrySet(address indexed registry);
    event FiduciaryOracleSet(address indexed oracle);
    event FreezeRegistrySet(address indexed registry);
    event TrustSeriesSet(bytes32 indexed trustId, bytes32 indexed seriesId);

    constructor(address admin, address trustRegistry_, address fiduciaryOracle_) {
        require(admin != address(0), "admin required");
        require(trustRegistry_ != address(0), "trust registry required");
        require(fiduciaryOracle_ != address(0), "oracle required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(DAO_COUNCIL, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(DAO_COUNCIL, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LEGAL_AUDITOR, DEFAULT_ADMIN_ROLE);

        trustRegistry = ITrustRegistry(trustRegistry_);
        fiduciaryOracle = FiduciaryOracle(fiduciaryOracle_);
    }

    function setTrustRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        require(registry != address(0), "trust registry required");
        trustRegistry = ITrustRegistry(registry);
        emit TrustRegistrySet(registry);
    }

    function setFiduciaryOracle(address oracle) external onlyRole(COMPLIANCE_ADMIN) {
        require(oracle != address(0), "oracle required");
        fiduciaryOracle = FiduciaryOracle(oracle);
        emit FiduciaryOracleSet(oracle);
    }

    function setFreezeRegistry(address registry) external onlyRole(COMPLIANCE_ADMIN) {
        freezeRegistry = IFreezeRegistry(registry);
        emit FreezeRegistrySet(registry);
    }

    function setTrustSeries(bytes32 trustId, bytes32 seriesId) external onlyRole(COMPLIANCE_ADMIN) {
        require(trustId != bytes32(0), "trust id required");
        trustSeries[trustId] = seriesId;
        emit TrustSeriesSet(trustId, seriesId);
    }

    function authorizeDistribution(bytes32 trustId, uint256 amount) external onlyRole(COMPLIANCE_ADMIN) returns (bool) {
        if (trustId == bytes32(0) || !trustRegistry.trustExists(trustId)) {
            emit DistributionBlocked(trustId, amount, BlockReason.TRUST_MISSING);
            return false;
        }
        if (amount == 0) {
            emit DistributionBlocked(trustId, amount, BlockReason.INSUFFICIENT_REVENUE);
            return false;
        }
        if (fiduciaryOracle.legalHoldActive(trustId)) {
            emit DistributionBlocked(trustId, amount, BlockReason.LEGAL_HOLD);
            return false;
        }
        if (_isFreezeActive(trustId)) {
            emit DistributionBlocked(trustId, amount, BlockReason.FREEZE_ACTIVE);
            return false;
        }

        uint256 available = fiduciaryOracle.availableRevenueOf(trustId);
        if (available < amount) {
            emit DistributionBlocked(trustId, amount, BlockReason.INSUFFICIENT_REVENUE);
            return false;
        }

        fiduciaryOracle.consumeRevenue(trustId, amount);
        emit DistributionAuthorized(trustId, amount, available - amount);
        return true;
    }

    function trustSeriesOf(bytes32 trustId) external view returns (bytes32) {
        return trustSeries[trustId];
    }

    function _isFreezeActive(bytes32 trustId) internal view returns (bool) {
        if (address(freezeRegistry) == address(0)) {
            return false;
        }
        bytes32 seriesId = trustSeries[trustId];
        if (seriesId != bytes32(0) && freezeRegistry.isFrozenSeries(seriesId)) {
            return true;
        }
        return freezeRegistry.isFrozenFunction(msg.sig);
    }
}
