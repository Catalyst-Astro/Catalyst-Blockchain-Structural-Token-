// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SymbolicPrinciples.sol";

/**
 * @title SymbolicAudit
 * @dev Contrato encargado de validar eventos simbólicos de acuerdo a principios
 *      narrativos y roles arquetípicos del DAO.
 */
contract SymbolicAudit is SymbolicPrinciples {
    struct EventoSimbolico {
        string tipo;
        string principio;
        address validador;
        string arquetipo;
        uint256 timestamp;
    }

    // Asignación de validador autorizado y su arquetipo.
    mapping(address => bool) public validadores;
    mapping(address => string) public arquetipoValidador;

    // Relación tipo de evento -> arquetipo requerido.
    mapping(string => string) public arquetipoPorTipo;

    // Último evento auditado y su resultado.
    EventoSimbolico private ultima;
    bool private ultimaValida;
    string private ultimaRazon;

    event EventoAuditado(bool valido, string razon);
    event PrincipioViolado(string principio, address validador);

    /**
     * @notice Registra o actualiza un validador autorizado.
     */
    function setValidador(address cuenta, string memory arquetipo) external onlyOwner {
        validadores[cuenta] = true;
        arquetipoValidador[cuenta] = arquetipo;
    }

    /// @notice Desautoriza a un validador.
    function removeValidador(address cuenta) external onlyOwner {
        validadores[cuenta] = false;
        arquetipoValidador[cuenta] = "";
    }

    /// @notice Establece qué arquetipo es válido para cierto tipo de evento.
    function setArquetipoParaTipo(string memory tipo, string memory arquetipo) external onlyOwner {
        arquetipoPorTipo[tipo] = arquetipo;
    }

    /**
     * @notice Audita un evento simbólico validando principios y roles.
     * @param evento Datos del evento a auditar.
     * @return valido true si pasa todas las validaciones.
     * @return razon motivo en caso de fallo.
     */
    function auditarEvento(EventoSimbolico memory evento) public returns (bool valido, string memory razon) {
        ultima = evento;
        // Validador debe estar autorizado
        if (!validadores[evento.validador]) {
            ultimaValida = false;
            ultimaRazon = "validador no autorizado";
            emit EventoAuditado(false, ultimaRazon);
            return (false, ultimaRazon);
        }
        // Principio debe estar aprobado
        if (!principiosValidos[evento.principio]) {
            ultimaValida = false;
            ultimaRazon = "principio no permitido";
            emit PrincipioViolado(evento.principio, evento.validador);
            emit EventoAuditado(false, ultimaRazon);
            return (false, ultimaRazon);
        }
        // Arquetipo del validador debe coincidir con el requerido por el tipo
        string memory requerido = arquetipoPorTipo[evento.tipo];
        if (bytes(requerido).length != 0 && keccak256(bytes(requerido)) != keccak256(bytes(arquetipoValidador[evento.validador]))) {
            ultimaValida = false;
            ultimaRazon = "arquetipo no coincide";
            emit EventoAuditado(false, ultimaRazon);
            return (false, ultimaRazon);
        }

        ultimaValida = true;
        ultimaRazon = "valido";
        emit EventoAuditado(true, ultimaRazon);
        return (true, "");
    }

    /// @notice Devuelve información de la última auditoría realizada.
    function getUltimaAuditoria() external view returns (EventoSimbolico memory, bool, string memory) {
        return (ultima, ultimaValida, ultimaRazon);
    }
}
