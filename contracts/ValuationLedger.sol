// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ValuationLedger
/// @notice Registra valuaciones firmadas por oráculos para cada proyecto y calcula valor total.
/// @dev Los montos se almacenan con sus propios decimales y se normalizan a 18 decimales para el TVP.
contract ValuationLedger is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct Valuation {
        uint256 projectId;
        address asset; // address(0) = ETH, o stablecoin ERC20
        uint256 amount; // en decimales indicados
        uint8 decimals; // decimales del amount (p.ej. 6 para USDC)
        bytes32 refHash; // hash de informe/justificación off-chain
        uint64 at;
    }

    // projectId => última valuación
    mapping(uint256 => Valuation) public latest;
    // dayIndex => total value (18 decimals)
    mapping(uint64 => uint256) public tvpByDay;
    // projectId => normalized 18-dec value
    mapping(uint256 => uint256) public normalizedValue;

    event ValuationRecorded(
        uint256 indexed projectId,
        address indexed asset,
        uint256 amount,
        uint8 decimals,
        bytes32 refHash,
        uint64 at,
        uint256 normalizedValue18
    );

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
    }

    function record(
        uint256 projectId,
        address asset,
        uint256 amount,
        uint8 decimals,
        bytes32 refHash
    ) external onlyRole(ORACLE_ROLE) returns (uint256 normalized) {
        require(projectId != 0, "projectId required");
        require(amount > 0, "amount required");
        normalized = _to18(amount, decimals);

        // update TVP delta
        uint256 prev = normalizedValue[projectId];
        normalizedValue[projectId] = normalized;

        uint64 dayIdx = uint64(block.timestamp / 1 days);
        // adjust tvp for the day
        uint256 tvpPrev = tvpByDay[dayIdx];
        tvpByDay[dayIdx] = tvpPrev + normalized - prev;

        latest[projectId] = Valuation({
            projectId: projectId,
            asset: asset,
            amount: amount,
            decimals: decimals,
            refHash: refHash,
            at: uint64(block.timestamp)
        });

        emit ValuationRecorded(projectId, asset, amount, decimals, refHash, uint64(block.timestamp), normalized);
    }

    function tvp() public view returns (uint256) {
        uint64 dayIdx = uint64(block.timestamp / 1 days);
        return tvpByDay[dayIdx];
    }

    function tvpAtDay(uint64 dayIdx) external view returns (uint256) {
        return tvpByDay[dayIdx];
    }

    function valueOf(uint256 projectId) external view returns (uint256 normalized18) {
        return normalizedValue[projectId];
    }

    function _to18(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        if (decimals == 18) return amount;
        require(decimals <= 18, "decimals too high");
        return amount * (10 ** (18 - decimals));
    }
}

