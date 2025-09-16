// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SymbolicPrinciples
 * @dev Ontología básica para registrar principios aceptados por el DAO.
 */
contract SymbolicPrinciples is Ownable {
    constructor() Ownable(msg.sender) {}
    // Principios aprobados por el DAO.
    mapping(string => bool) public principiosValidos;
    // Lista para consultas externas.
    string[] private principios;

    /**
     * @notice Registra un nuevo principio simbólico.
     * @param principio Texto representando el principio.
     */
    function agregarPrincipio(string memory principio) public onlyOwner {
        require(!principiosValidos[principio], "ya registrado");
        principiosValidos[principio] = true;
        principios.push(principio);
    }

    /// @notice Obtiene la lista completa de principios.
    function getPrincipios() external view returns (string[] memory) {
        return principios;
    }
}
