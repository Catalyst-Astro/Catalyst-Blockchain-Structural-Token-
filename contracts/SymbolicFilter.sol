// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./storage/OntologyRegistry.sol";

/// @title SymbolicFilter
/// @notice Validates DAO proposals against registered symbolic principles.
contract SymbolicFilter is OntologyRegistry {
    event PrincipleViolated(address indexed replica, bytes32 principle);

    /// @dev Returns true if all proposal tags match the replica's symbolic principles.
    function validateProposal(address replica, bytes32[] calldata tags) public returns (bool) {
        Ontology storage ont = ontologies[replica];
        for (uint256 i = 0; i < tags.length; i++) {
            bool ok = false;
            for (uint256 j = 0; j < ont.symbolicPrinciples.length; j++) {
                if (tags[i] == ont.symbolicPrinciples[j]) {
                    ok = true;
                    break;
                }
            }
            if (!ok) {
                emit PrincipleViolated(replica, tags[i]);
                return false;
            }
        }
        return true;
    }
}
