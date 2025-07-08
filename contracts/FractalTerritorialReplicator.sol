// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./DAOFactory.sol";
import "./TerritoryStructs.sol";
import "./interfaces/IReplicationValidator.sol";

contract FractalTerritorialReplicator is Ownable {
    DAOFactory public immutable factory;
    IReplicationValidator public validator;

    struct Territory {
        TerritoryStructs.Metadata meta;
        address governanceDAO;
        address subsidyVault;
        address registry;
        bytes32 metadataHash;
        bytes32 territorialHash;
    }

    uint256 public nextId;
    mapping(uint256 => Territory) public territories;
    mapping(address => uint256[]) private childrenByDAO;

    event TerritoryReplicated(uint256 indexed territoryId, address governanceDAO, address subsidyVault, address registry);
    event DAOCloned(address indexed newDAO, address indexed template);
    event ReplicationVerified(uint256 indexed territoryId, bytes32 territorialHash);

    constructor(DAOFactory _factory, IReplicationValidator _validator) {
        factory = _factory;
        validator = _validator;
    }

    function registerTerritory(
        string memory name,
        string memory coordinates,
        string memory entity,
        TerritoryStructs.NucleusType nucleus,
        address parentDAO,
        address localGovernment
    ) external onlyOwner returns (uint256 id) {
        id = nextId++;
        territories[id].meta = TerritoryStructs.Metadata({
            id: id,
            name: name,
            coordinates: coordinates,
            politicalEntity: entity,
            nucleusType: nucleus,
            parentDAO: parentDAO,
            localGovernment: localGovernment
        });
        if (parentDAO != address(0)) {
            childrenByDAO[parentDAO].push(id);
        }
    }

    function replicateCoreEcosystem(
        uint256 territoryId,
        address daoTemplate,
        address vaultTemplate,
        address registryTemplate,
        TerritoryStructs.ValidationDocs calldata docs
    ) external onlyOwner {
        Territory storage t = territories[territoryId];
        require(t.meta.id == territoryId, "unregistered");
        require(docs.daoValidator && docs.actaFundacional && docs.technicalCommittee, "docs missing");
        if (address(validator) != address(0)) {
            require(validator.validateReplication(territoryId, docs), "external validation failed");
        }
        address daoClone = factory.clone(daoTemplate, "");
        address vaultClone = factory.clone(vaultTemplate, "");
        address registryClone = factory.clone(registryTemplate, "");
        t.governanceDAO = daoClone;
        t.subsidyVault = vaultClone;
        t.registry = registryClone;
        t.territorialHash = keccak256(abi.encode(docs, daoClone, vaultClone, registryClone));
        emit DAOCloned(daoClone, daoTemplate);
        emit TerritoryReplicated(territoryId, daoClone, vaultClone, registryClone);
        emit ReplicationVerified(territoryId, t.territorialHash);
    }

    function initializeTerritory(uint256 territoryId, address deployer, bytes32 metadataHash) external onlyOwner {
        Territory storage t = territories[territoryId];
        require(t.meta.id == territoryId, "unregistered");
        t.metadataHash = metadataHash;
        if (deployer != address(0) && t.governanceDAO != address(0)) {
            (bool ok,) = t.governanceDAO.call(abi.encodeWithSignature("transferOwnership(address)", deployer));
            ok;
        }
    }

    function getReplicationTrace(address dao) external view returns (uint256[] memory) {
        return childrenByDAO[dao];
    }
}

