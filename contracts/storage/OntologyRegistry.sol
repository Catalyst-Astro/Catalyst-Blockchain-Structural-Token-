// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title OntologyRegistry
/// @notice Stores symbolic principles and governance archetypes for each territorial replica.
contract OntologyRegistry {
    enum GovernanceArchetype { AGRICULTURAL, SOLAR, COMUNAL, TECNOLOGICO, CUSTODIO, ESPIRITUAL }

    struct Ontology {
        bytes32[] symbolicPrinciples;
        string foundationalGlyph;
        GovernanceArchetype governanceArchetype;
        uint256 version;
    }

    mapping(address => Ontology) internal ontologies;

    event OntologyUpdated(address indexed replica, uint256 version);

    function _setOntology(address replica, Ontology memory ontology) internal {
        ontologies[replica] = ontology;
        emit OntologyUpdated(replica, ontology.version);
    }

    function getOntology(address replica) external view returns (Ontology memory) {
        return ontologies[replica];
    }
}
