// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title EntityRegistry
/// @notice Registers corporate entities and links operational wallets.
contract EntityRegistry is AccessControl {
    bytes32 public constant COMPLIANCE_ADMIN = keccak256("COMPLIANCE_ADMIN");
    bytes32 public constant UBO_VERIFIER = keccak256("UBO_VERIFIER");
    bytes32 public constant LEGAL_AUDITOR = keccak256("LEGAL_AUDITOR");
    bytes32 public constant DAO_COUNCIL = keccak256("DAO_COUNCIL");

    enum EntityStatus {
        ACTIVE,
        SUSPENDED,
        CLOSED
    }

    struct Entity {
        bytes32 entityId;
        bytes32 jurisdictionCode;
        bytes32 typeCode;
        EntityStatus status;
        uint64 createdAt;
        uint64 updatedAt;
    }

    mapping(bytes32 => Entity) private entities;
    mapping(address => bytes32) private walletToEntity;

    event EntityCreated(bytes32 indexed entityId, bytes32 indexed jurisdictionCode, bytes32 indexed typeCode);
    event EntityStatusChanged(bytes32 indexed entityId, EntityStatus status);
    event WalletLinked(bytes32 indexed entityId, address indexed wallet);
    event WalletUnlinked(bytes32 indexed entityId, address indexed wallet);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ADMIN, admin);
        _grantRole(UBO_VERIFIER, admin);
        _grantRole(LEGAL_AUDITOR, admin);
        _grantRole(DAO_COUNCIL, admin);
        _setRoleAdmin(UBO_VERIFIER, COMPLIANCE_ADMIN);
        _setRoleAdmin(LEGAL_AUDITOR, COMPLIANCE_ADMIN);
        _setRoleAdmin(DAO_COUNCIL, COMPLIANCE_ADMIN);
    }

    function createEntity(bytes32 entityId, bytes32 jurisdictionCode, bytes32 typeCode)
        external
        onlyRole(COMPLIANCE_ADMIN)
    {
        require(entityId != bytes32(0), "entity id required");
        require(entities[entityId].createdAt == 0, "entity exists");
        require(jurisdictionCode != bytes32(0), "jurisdiction required");
        require(typeCode != bytes32(0), "type required");

        uint64 nowTs = uint64(block.timestamp);
        entities[entityId] = Entity({
            entityId: entityId,
            jurisdictionCode: jurisdictionCode,
            typeCode: typeCode,
            status: EntityStatus.ACTIVE,
            createdAt: nowTs,
            updatedAt: nowTs
        });

        emit EntityCreated(entityId, jurisdictionCode, typeCode);
    }

    function setEntityStatus(bytes32 entityId, EntityStatus status) external onlyRole(COMPLIANCE_ADMIN) {
        require(entities[entityId].createdAt != 0, "entity missing");
        entities[entityId].status = status;
        entities[entityId].updatedAt = uint64(block.timestamp);
        emit EntityStatusChanged(entityId, status);
    }

    function linkWallet(bytes32 entityId, address wallet) external onlyRole(COMPLIANCE_ADMIN) {
        require(entities[entityId].createdAt != 0, "entity missing");
        require(wallet != address(0), "wallet required");
        walletToEntity[wallet] = entityId;
        emit WalletLinked(entityId, wallet);
    }

    function unlinkWallet(address wallet) external onlyRole(COMPLIANCE_ADMIN) {
        require(wallet != address(0), "wallet required");
        bytes32 entityId = walletToEntity[wallet];
        require(entityId != bytes32(0), "wallet not linked");
        delete walletToEntity[wallet];
        emit WalletUnlinked(entityId, wallet);
    }

    function entityOf(address wallet) external view returns (bytes32) {
        return walletToEntity[wallet];
    }

    function getEntity(bytes32 entityId) external view returns (Entity memory) {
        return entities[entityId];
    }

    function isActive(bytes32 entityId) external view returns (bool) {
        return entities[entityId].status == EntityStatus.ACTIVE;
    }
}
