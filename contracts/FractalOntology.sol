// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SymbolicFilter.sol";
import "./interfaces/ISymbolicDAO.sol";

/// @title FractalOntology
/// @notice Core contract binding territorial replicas with their symbolic ontology.
contract FractalOntology is SymbolicFilter {
    address public immutable replicator;
    ISymbolicDAO public dao;

    event OntologyRegistered(address indexed replica, GovernanceArchetype archetype);
    event SymbolicVoteCast(address indexed voter, uint256 proposalId, uint256 weight);

    modifier onlyReplicator() {
        require(msg.sender == replicator, "not replicator");
        _;
    }

    constructor(address _replicator, ISymbolicDAO _dao) {
        replicator = _replicator;
        dao = _dao;
    }

    /// @notice Register or update the ontology for a territorial replica.
    function registerOntology(
        address replica,
        bytes32[] calldata principles,
        string calldata glyph,
        GovernanceArchetype archetype,
        uint256 version
    ) external onlyReplicator {
        Ontology memory o = Ontology({
            symbolicPrinciples: principles,
            foundationalGlyph: glyph,
            governanceArchetype: archetype,
            version: version
        });
        _setOntology(replica, o);
        emit OntologyRegistered(replica, archetype);
    }

    /// @notice Cast a symbolic vote with optional weighting based on archetype.
    function castSymbolicVote(uint256 proposalId, bool support) external {
        uint256 weight = dao.voteWeight(msg.sender);
        Ontology storage o = ontologies[msg.sender];
        if (o.governanceArchetype == dao.requiredArchetype(proposalId)) {
            weight *= 2;
        }
        dao.vote(proposalId, support, weight);
        emit SymbolicVoteCast(msg.sender, proposalId, weight);
    }
}
