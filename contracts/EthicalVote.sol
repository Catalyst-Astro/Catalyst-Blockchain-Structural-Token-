// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EthicalVote
/// @notice Simple symbolic voting registry with basic reputation tracking.
contract EthicalVote {
    struct NodoDAO {
        address user;
        string arquetipo;
        uint256 reputacion;          // 0–100
        uint256 ciclosParticipados;
        uint256 eventosSimbolicos;
    }

    mapping(address => NodoDAO) private nodos;
    uint256 public totalEventos;

    event NodoRegistrado(address indexed user, string arquetipo);
    event VotoSimbolico(address indexed user, uint256 indexed eventoId);
    event CicloRegistrado(address indexed user, uint256 totalCiclos);
    event ReputacionActualizada(address indexed user, uint256 nuevaReputacion);

    /// @notice Register caller as a NodoDAO with an archetype.
    function registrarNodo(string calldata arquetipo) external {
        require(nodos[msg.sender].user == address(0), "ya registrado");
        nodos[msg.sender] = NodoDAO({
            user: msg.sender,
            arquetipo: arquetipo,
            reputacion: 50,
            ciclosParticipados: 0,
            eventosSimbolicos: 0
        });
        emit NodoRegistrado(msg.sender, arquetipo);
    }

    /// @notice Record participation in a cycle for the caller.
    function registrarCiclo() external {
        NodoDAO storage n = nodos[msg.sender];
        require(n.user != address(0), "no registrado");
        n.ciclosParticipados += 1;
        emit CicloRegistrado(msg.sender, n.ciclosParticipados);
    }

    /// @notice Emit a symbolic vote event from the caller.
    function votarSimbolicamente() external {
        NodoDAO storage n = nodos[msg.sender];
        require(n.user != address(0), "no registrado");
        n.eventosSimbolicos += 1;
        totalEventos += 1;
        emit VotoSimbolico(msg.sender, totalEventos);
    }

    /// @notice Update reputation for the caller. Reputation is capped between 0 and 100.
    function actualizarReputacion(uint256 reputacionNueva) external {
        require(reputacionNueva <= 100, "max 100");
        NodoDAO storage n = nodos[msg.sender];
        require(n.user != address(0), "no registrado");
        n.reputacion = reputacionNueva;
        emit ReputacionActualizada(msg.sender, reputacionNueva);
    }

    /// @notice View NodoDAO details for a given user.
    function obtenerNodo(address user) external view returns (
        string memory arquetipo,
        uint256 reputacion,
        uint256 ciclosParticipados,
        uint256 eventosSimbolicos
    ) {
        NodoDAO storage n = nodos[user];
        require(n.user != address(0), "no registrado");
        return (n.arquetipo, n.reputacion, n.ciclosParticipados, n.eventosSimbolicos);
    }
}
