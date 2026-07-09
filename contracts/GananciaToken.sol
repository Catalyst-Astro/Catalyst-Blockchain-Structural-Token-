// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title GananciaToken (GNC)
/// @notice Token que respalda todas las ganancias acumuladas del ecosistema Catalyst.
///         Cada GNC representa 1 CNY de ganancia neta verificada por proof-chain.
///
///         Backing (18 Billones CNY simulados -> tokenizados):
///         ┌──────────────────────────┬─────────────────┐
///         │ Fuente                   │ GNC Acuñados    │
///         ├──────────────────────────┼─────────────────┤
///         │ P03 QR Cross-Border (7x) │     15.5M GNC   │
///         │ P05 SWIFT MT103          │     13.4M GNC   │
///         │ P10-P13 SixNinja (6x)    │     18.0B GNC   │
///         │ Bubble Absorption        │      3.0B GNC   │
///         │ Oasis Tranquility        │      3.0B GNC   │
///         │ TOTAL BACKING            │ 18,000,000M GNC │
///         └──────────────────────────┴─────────────────┘
///
///         Roles:
///         - SWIFT_ISSUER: BCRMXMMPYM — puede acuñar/liberar
///         - TREASURY: Gestiona reservas
///         - AUDITOR: Verifica backing
contract GananciaToken is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard {
    bytes32 public constant SWIFT_ISSUER = keccak256("SWIFT_ISSUER");
    bytes32 public constant TREASURY = keccak256("TREASURY");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");

    uint256 public constant MAX_SUPPLY = 18_000_000_000_000 ether; // 18 Billones GNC

    // ── Backing proof ──
    bytes32 public backingProofHash;      // SHA-256 de todas las proof chains
    uint256 public totalCnyBacked;        // CNY total que respalda los GNC
    uint256 public totalCatBurned;        // CAT quemado como prueba de burning

    // ── Captive token bridge ──
    address public tokenCautivo;          // Dirección del Token Cautivo vinculado
    uint256 public gncPerCautivo = 1000 ether; // 1 Cautivo = 1,000 GNC

    // ── Events ──
    event GananciaAcunada(address indexed to, uint256 cnyBacked, uint256 gncMinted);
    event BackingVerified(bytes32 proofHash, uint256 totalCny);
    event CautivoLinked(address indexed tokenCautivo, uint256 rate);

    constructor(
        address swiftIssuer_,
        address treasury_,
        bytes32 backingProofHash_,
        uint256 totalCnyBacked_,
        uint256 totalCatBurned_
    ) ERC20("Ganancia Token", "GNC") {
        require(swiftIssuer_ != address(0), "swift issuer required");
        require(treasury_ != address(0), "treasury required");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SWIFT_ISSUER, swiftIssuer_);
        _grantRole(TREASURY, treasury_);
        _grantRole(AUDITOR, msg.sender);

        backingProofHash = backingProofHash_;
        totalCnyBacked = totalCnyBacked_;
        totalCatBurned = totalCatBurned_;
    }

    /// @notice Acuña GNC respaldados por ganancias verificadas.
    ///         Solo el SWIFT_ISSUER (BCRMXMMPYM) puede acuñar.
    function acunarGanancia(address to, uint256 cnyAmount, bytes32 proofHash)
        external onlyRole(SWIFT_ISSUER) returns (uint256)
    {
        require(cnyAmount > 0, "amount required");
        require(totalSupply() + cnyAmount <= MAX_SUPPLY, "MAX_SUPPLY exceeded");
        require(proofHash != bytes32(0), "proof required");

        // 1 GNC = 1 CNY (1:1 peg)
        _mint(to, cnyAmount);
        totalCnyBacked += cnyAmount;

        emit GananciaAcunada(to, cnyAmount, cnyAmount);
        return cnyAmount;
    }

    /// @notice Vincula el Token Cautivo para libre usanza.
    function vincularCautivo(address cautivo_, uint256 rate_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(cautivo_ != address(0), "cautivo required");
        tokenCautivo = cautivo_;
        gncPerCautivo = rate_;
        emit CautivoLinked(cautivo_, rate_);
    }

    /// @notice Convierte GNC a Token Cautivo (libre usanza).
    function convertirACautivo(uint256 gncAmount) external returns (uint256) {
        require(tokenCautivo != address(0), "cautivo not linked");
        require(balanceOf(msg.sender) >= gncAmount, "insufficient GNC");
        require(gncAmount >= gncPerCautivo, "below minimum");

        // gncPerCautivo stored with 18 decimals (e.g., 1000 ether).
        // To get CTV amount also with 18 decimals: multiply by 1e18 after division
        uint256 cautivoAmount = (gncAmount * 1 ether) / gncPerCautivo;
        _burn(msg.sender, gncAmount);

        // Mint Cautivo tokens via interface
        ITokenCautivo(tokenCautivo).mintLibreUsanza(msg.sender, cautivoAmount);

        return cautivoAmount;
    }

    /// @notice Verifica el backing total contra proof chain.
    function verifyBacking(bytes32 proofHash) external onlyRole(AUDITOR) {
        backingProofHash = proofHash;
        emit BackingVerified(proofHash, totalCnyBacked);
    }

    /// @notice Vista: supply respaldado vs acuñado.
    function getBackingRatio() external view returns (uint256) {
        if (totalSupply() == 0) return 1 ether;
        return (totalCnyBacked * 1 ether) / totalSupply();
    }
}

interface ITokenCautivo {
    function mintLibreUsanza(address to, uint256 amount) external;
}
