// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ProjectRegistry
/// @notice Registra proyectos (SAS, cooperativas, otros) que aportan valor al sistema.
/// @dev Diseñado para trabajar junto a ValuationLedger. No emite tokens; solo censa proyectos.
contract ProjectRegistry is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    enum EntityType {
        UNKNOWN,
        SAS,
        COOPERATIVE,
        OTHER
    }

    struct Project {
        uint256 id;
        string name;
        EntityType entityType;
        address treasury; // billetera o contrato custodio del proyecto
        uint256 maxSupply; // tokens asignados a este proyecto (referencia)
        bytes32 metaHash; // hash de documentación off-chain (IPFS/Arweave/etc.)
        uint64 createdAt;
        bool active;
    }

    uint256 public nextId = 1;
    mapping(uint256 => Project) public projects;

    event ProjectCreated(
        uint256 indexed id,
        string name,
        EntityType entityType,
        address treasury,
        uint256 maxSupply,
        bytes32 metaHash
    );
    event ProjectStatusChanged(uint256 indexed id, bool active);
    event ProjectMetaUpdated(uint256 indexed id, bytes32 metaHash, address treasury, uint256 maxSupply);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
    }

    function createProject(
        string calldata name,
        EntityType entityType,
        address treasury,
        uint256 maxSupply,
        bytes32 metaHash
    ) external onlyRole(MANAGER_ROLE) returns (uint256 id) {
        require(bytes(name).length > 0, "name required");
        id = nextId++;
        projects[id] = Project({
            id: id,
            name: name,
            entityType: entityType,
            treasury: treasury,
            maxSupply: maxSupply,
            metaHash: metaHash,
            createdAt: uint64(block.timestamp),
            active: true
        });
        emit ProjectCreated(id, name, entityType, treasury, maxSupply, metaHash);
    }

    function setActive(uint256 id, bool active) external onlyRole(MANAGER_ROLE) {
        Project storage p = projects[id];
        require(p.id != 0, "not found");
        p.active = active;
        emit ProjectStatusChanged(id, active);
    }

    function updateMeta(
        uint256 id,
        bytes32 metaHash,
        address treasury,
        uint256 maxSupply
    ) external onlyRole(MANAGER_ROLE) {
        Project storage p = projects[id];
        require(p.id != 0, "not found");
        p.metaHash = metaHash;
        p.treasury = treasury;
        p.maxSupply = maxSupply;
        emit ProjectMetaUpdated(id, metaHash, treasury, maxSupply);
    }
}

