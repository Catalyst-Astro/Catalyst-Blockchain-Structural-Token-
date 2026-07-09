// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title EntityRegistry
/// @notice Classifies wallets as individual or corporate for compliance policies.
contract EntityRegistry is AccessControl {
    enum EntityType {
        UNKNOWN,
        INDIVIDUAL,
        CORPORATE
    }

    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");

    mapping(address => EntityType) private entityTypeOf;
    mapping(address => bytes32) private entityIdOf;
    mapping(bytes32 => EntityType) private entityTypeById;
    mapping(bytes32 => EntityRecord) private entities;

    struct EntityRecord {
        bytes32 jurisdiction;
        bytes32 typeCode;
        bool active;
        address[] wallets;
    }

    event EntityTypeSet(address indexed wallet, EntityType entityType);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _setRoleAdmin(COMPLIANCE_ADMIN, DEFAULT_ADMIN_ROLE);
    }

    function setEntityType(address wallet, EntityType entityType) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        entityTypeOf[wallet] = entityType;
        bytes32 entityId = keccak256(abi.encodePacked(wallet));
        entityIdOf[wallet] = entityId;
        entityTypeById[entityId] = entityType;
        emit EntityTypeSet(wallet, entityType);
    }

    /// @notice Legacy support to create a corporate entity with metadata.
    function createEntity(bytes32 entityId, bytes32 jurisdiction, bytes32 typeCode) external onlyRole(COMPLIANCE_ADMIN) {
        require(entityId != bytes32(0), "entityId required");
        EntityRecord storage rec = entities[entityId];
        rec.jurisdiction = jurisdiction;
        rec.typeCode = typeCode;
        rec.active = true;
        entityTypeById[entityId] = EntityType.CORPORATE;
    }

    /// @notice Legacy support to bind a wallet to an entityId; marks wallet as CORPORATE.
    function linkWallet(bytes32 entityId, address wallet) external onlyRole(COMPLIANCE_ADMIN) {
        require(entityId != bytes32(0), "entityId required");
        require(wallet != address(0), "wallet required");
        EntityRecord storage rec = entities[entityId];
        require(rec.active, "entity not active");
        rec.wallets.push(wallet);
        entityIdOf[wallet] = entityId;
        entityTypeOf[wallet] = EntityType.CORPORATE;
        entityTypeById[entityId] = EntityType.CORPORATE;
        emit EntityTypeSet(wallet, EntityType.CORPORATE);
    }

    function typeOf(address wallet) external view returns (EntityType) {
        return entityTypeOf[wallet];
    }

    /// @notice Backwards compatibility: returns true when an entity type is set.
    function isActive(address wallet) external view returns (bool) {
        return entityTypeOf[wallet] != EntityType.UNKNOWN;
    }

    /// @notice Returns the derived entity id for a wallet.
    function entityOf(address wallet) external view returns (bytes32) {
        return entityIdOf[wallet];
    }

    /// @notice Legacy compatibility: checks whether an entityId has a registered type.
    function isActive(bytes32 entityId) external view returns (bool) {
        EntityRecord storage rec = entities[entityId];
        return rec.active || entityTypeById[entityId] != EntityType.UNKNOWN;
    }
}
