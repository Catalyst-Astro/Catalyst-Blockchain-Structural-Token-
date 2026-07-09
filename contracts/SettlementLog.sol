// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title SettlementLog
/// @notice Libro mayor ligero para registrar liquidaciones (cash-in/out) y calcular volumen diario por activo.
/// @dev Pensado para ser consumido por frontends/ETL; no mueve fondos, solo deja evidencia on-chain.
contract SettlementLog is AccessControl {
    enum Direction {
        IN,
        OUT
    }

    struct Settlement {
        uint256 id;
        address asset; // address(0) = ETH nativo
        address account;
        uint256 amount;
        Direction direction;
        bytes32 externalRef; // hash de referencia off-chain (orden/boleta/VID)
        uint64 at; // timestamp
    }

    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");

    uint256 public nextId = 1;

    /// @dev asset => dayIndex => volume
    mapping(address => mapping(uint64 => uint256)) private _dailyVolume;
    mapping(uint256 => Settlement) private _settlements;

    event SettlementRecorded(
        uint256 indexed id,
        address indexed asset,
        address indexed account,
        uint256 amount,
        Direction direction,
        bytes32 externalRef,
        uint64 at
    );

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RECORDER_ROLE, admin);
    }

    /// @notice Registra una liquidacion. No transfiere fondos: solo deja constancia.
    function record(
        address asset,
        address account,
        uint256 amount,
        Direction direction,
        bytes32 externalRef
    ) external onlyRole(RECORDER_ROLE) returns (uint256 id) {
        require(amount > 0, "amount required");
        uint64 dayIdx = uint64(block.timestamp / 1 days);

        id = nextId++;
        Settlement memory s = Settlement({
            id: id,
            asset: asset,
            account: account,
            amount: amount,
            direction: direction,
            externalRef: externalRef,
            at: uint64(block.timestamp)
        });

        _settlements[id] = s;
        _dailyVolume[asset][dayIdx] += amount;

        emit SettlementRecorded(id, asset, account, amount, direction, externalRef, s.at);
    }

    function get(uint256 id) external view returns (Settlement memory) {
        return _settlements[id];
    }

    function dailyVolume(address asset, uint64 dayIdx) external view returns (uint256) {
        return _dailyVolume[asset][dayIdx];
    }
}

