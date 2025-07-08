// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFractalToken {
    function balanceOf(address account) external view returns (uint256);
}

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title FractalDAO
/// @notice DAO governance with symbolic weighted voting compatible with FractalToken.
contract FractalDAO is Ownable {
    IFractalToken public immutable fractalToken;

    struct NodoSimbolico {
        string arquetipo;
        uint256 participacionNarrativa;
        uint256 ciclosCompletados;
        uint256 reputacion; // 0-100
    }

    struct Proposal {
        string descripcion;
        uint256 votosAFavor;
        uint256 votosEnContra;
        bool ejecutada;
        mapping(address => bool) votado;
    }

    uint256 public propuestaContador;
    mapping(address => NodoSimbolico) public nodos;
    mapping(uint256 => Proposal) private propuestas;

    event NodoActualizado(address indexed votante, string arquetipo, uint256 participacion, uint256 ciclos, uint256 reputacion);
    event PropuestaCreada(uint256 id, string descripcion);
    event Votado(uint256 id, address votante, bool apoyo, uint256 peso);
    event PropuestaEjecutada(uint256 id);

    constructor(IFractalToken token) Ownable(msg.sender) {
        fractalToken = token;
    }

    /// @notice Actualiza la información simbólica de un votante.
    function setNodo(
        address votante,
        string calldata arquetipo,
        uint256 participacionNarrativa,
        uint256 ciclosCompletados,
        uint256 reputacion
    ) external onlyOwner {
        require(reputacion <= 100, "reputacion max 100");
        nodos[votante] = NodoSimbolico(arquetipo, participacionNarrativa, ciclosCompletados, reputacion);
        emit NodoActualizado(votante, arquetipo, participacionNarrativa, ciclosCompletados, reputacion);
    }

    /// @notice Crea una nueva propuesta.
    function crearPropuesta(string calldata descripcion) external returns (uint256) {
        uint256 id = propuestaContador++;
        Proposal storage p = propuestas[id];
        p.descripcion = descripcion;
        emit PropuestaCreada(id, descripcion);
        return id;
    }

    /// @notice Calcula el peso de voto de un votante según su nodo simbólico y balance de tokens.
    function pesoVoto(address votante) public view returns (uint256) {
        NodoSimbolico storage n = nodos[votante];
        uint256 tokens = fractalToken.balanceOf(votante);
        return (tokens / 1e18) + n.participacionNarrativa + (n.ciclosCompletados * 2) + (n.reputacion / 10);
    }

    /// @notice Emite un voto ponderado sobre una propuesta.
    function votar(uint256 propuestaId, bool apoyo) external {
        Proposal storage p = propuestas[propuestaId];
        require(!p.ejecutada, "ejecutada");
        require(!p.votado[msg.sender], "ya voto");

        uint256 peso = pesoVoto(msg.sender);
        require(peso > 0, "sin peso");

        p.votado[msg.sender] = true;
        if (apoyo) {
            p.votosAFavor += peso;
        } else {
            p.votosEnContra += peso;
        }

        emit Votado(propuestaId, msg.sender, apoyo, peso);
    }

    /// @notice Ejecuta una propuesta si tiene más votos a favor que en contra.
    function ejecutar(uint256 propuestaId) external {
        Proposal storage p = propuestas[propuestaId];
        require(!p.ejecutada, "ejecutada");
        require(p.votosAFavor > p.votosEnContra, "no aprobada");
        p.ejecutada = true;
        emit PropuestaEjecutada(propuestaId);
    }

    function obtenerPropuesta(uint256 propuestaId)
        external
        view
        returns (
            string memory descripcion,
            uint256 votosAFavor,
            uint256 votosEnContra,
            bool ejecutada
        )
    {
        Proposal storage p = propuestas[propuestaId];
        return (p.descripcion, p.votosAFavor, p.votosEnContra, p.ejecutada);
    }
}

