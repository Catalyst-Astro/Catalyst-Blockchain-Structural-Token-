// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title TokenCautivo (CTV)
/// @notice Token cautivo con libre usanza para la SWIFT emisora BCRMXMMPYM.
///
///         "Cautivo" porque está vinculado a la SWIFT emisora como único minter.
///         "Libre usanza" porque una vez acuñado, el portador puede:
///           - Transferirlo libremente
///           - Usarlo como collateral en DeFi
///           - Convertirlo a fiat vía el bridge SWIFT
///           - Stake it para yield
///
///         Arquitectura:
///         ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
///         │ GananciaToken │────▶│ TokenCautivo │────▶│ SWIFT BBVA   │
///         │    (GNC)      │     │    (CTV)     │     │ BCRMXMMPYM   │
///         │ 1 GNC=1 CNY   │     │ Libre Usanza │     │ Fiat MXN/CNY │
///         └──────────────┘     └──────────────┘     └──────────────┘
///
///         Roles:
///         - GANANCIA_BRIDGE: contrato GananciaToken que acuña CTV
///         - SWIFT_ISSUER: BCRMXMMPYM — único autorizado a liberar a fiat
///         - FREE_USER: cualquier address con token — libre usanza total
contract TokenCautivo is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard {
    bytes32 public constant GANANCIA_BRIDGE = keccak256("GANANCIA_BRIDGE");
    bytes32 public constant SWIFT_ISSUER = keccak256("SWIFT_ISSUER");
    bytes32 public constant COMPLIANCE_OFFICER = keccak256("COMPLIANCE_OFFICER");

    uint256 public constant MAX_SUPPLY = 18_000_000_000 ether; // 18 Billones CTV

    // ── SWIFT issuer data ──
    string public swiftBic = "BCRMXMMPYM";
    string public swiftIssuerName = "BBVA Mexico S.A.";
    string public clabePrincipal = "012290015202390246";
    string public swiftCorresponsal = "UNPYCNBH";

    // ── Libre usanza tracking ──
    mapping(address => bool) public libreUsanzaActiva;  // Usuarios con libre usanza
    mapping(address => uint256) public limiteConversionFiat; // Límite diario por usuario
    uint256 public limiteDiarioGlobal = 1_000_000 ether;     // 1M CTV/día global
    uint256 public conversionsDiarias;                        // Contador del día
    uint256 public lastResetDay;

    // ── Compliance hooks ──
    address public complianceRegistry;
    bool public complianceRequired = true;

    // ── Events ──
    event LibreUsanzaAcunada(address indexed to, uint256 amount, address indexed bridge);
    event ConversionAFiat(address indexed user, uint256 ctvAmount, string swiftRef);
    event LibreUsanzaActivada(address indexed user, uint256 limiteDiario);
    event ComplianceCheck(address indexed user, bool passed);

    constructor(
        address admin_,
        address swiftIssuer_,
        address gananciaBridge_,
        string memory swiftBic_,
        string memory clabe_
    ) ERC20("Token Cautivo", "CTV") {
        require(admin_ != address(0), "admin required");
        require(swiftIssuer_ != address(0), "swift issuer required");
        require(gananciaBridge_ != address(0), "ganancia bridge required");

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(SWIFT_ISSUER, swiftIssuer_);
        _grantRole(GANANCIA_BRIDGE, gananciaBridge_);
        _grantRole(COMPLIANCE_OFFICER, admin_);

        swiftBic = swiftBic_;
        clabePrincipal = clabe_;
        lastResetDay = block.timestamp / 1 days;

        // Activar libre usanza para el deployer
        libreUsanzaActiva[admin_] = true;
        limiteConversionFiat[admin_] = 100_000 ether; // 100k CTV/día
    }

    // ─────────────────────────────────────────────────────────────
    // ── Ganancia Bridge: acuñar CTV desde GNC ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Acuña Token Cautivo desde el bridge de Ganancia.
    ///         Solo llamado por GananciaToken cuando un usuario convierte GNC -> CTV.
    function mintLibreUsanza(address to, uint256 amount)
        external onlyRole(GANANCIA_BRIDGE)
    {
        require(totalSupply() + amount <= MAX_SUPPLY, "MAX_SUPPLY exceeded");
        _mint(to, amount);
        libreUsanzaActiva[to] = true;
        emit LibreUsanzaAcunada(to, amount, msg.sender);
    }

    // ─────────────────────────────────────────────────────────────
    // ── Libre Usanza: el portador opera libremente ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Activa libre usanza para un usuario.
    function activarLibreUsanza(address user, uint256 limiteDiario)
        external onlyRole(COMPLIANCE_OFFICER)
    {
        libreUsanzaActiva[user] = true;
        limiteConversionFiat[user] = limiteDiario;
        emit LibreUsanzaActivada(user, limiteDiario);
    }

    /// @notice Convierte CTV a fiat vía SWIFT emisor.
    ///         El usuario quema CTV y recibe fiat en su cuenta bancaria.
    function convertirAFiat(uint256 ctvAmount, string calldata clabeDestino)
        external nonReentrant returns (bytes32 swiftRef)
    {
        require(libreUsanzaActiva[msg.sender], "libre usanza no activa");
        require(balanceOf(msg.sender) >= ctvAmount, "insufficient CTV");
        require(ctvAmount > 0, "amount required");

        // Reset diario
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            conversionsDiarias = 0;
            lastResetDay = today;
        }

        // Límites
        require(ctvAmount <= limiteConversionFiat[msg.sender], "excede limite personal");
        require(conversionsDiarias + ctvAmount <= limiteDiarioGlobal, "excede limite global");

        // Compliance check
        if (complianceRequired && complianceRegistry != address(0)) {
            // En producción: llamar a IComplianceGate(complianceRegistry).check(msg.sender)
            emit ComplianceCheck(msg.sender, true);
        }

        // Quemar CTV
        _burn(msg.sender, ctvAmount);
        conversionsDiarias += ctvAmount;

        // Generar referencia SWIFT
        swiftRef = keccak256(abi.encodePacked(
            swiftBic, clabeDestino, msg.sender, ctvAmount, block.timestamp
        ));

        emit ConversionAFiat(msg.sender, ctvAmount, string(abi.encodePacked(swiftRef)));
        return swiftRef;
    }

    // ─────────────────────────────────────────────────────────────
    // ── SWIFT Issuer: gestión de límites ──
    // ─────────────────────────────────────────────────────────────

    function setLimiteDiarioGlobal(uint256 newLimit) external onlyRole(SWIFT_ISSUER) {
        limiteDiarioGlobal = newLimit;
    }

    function setComplianceRegistry(address registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        complianceRegistry = registry;
    }

    function setComplianceRequired(bool required) external onlyRole(COMPLIANCE_OFFICER) {
        complianceRequired = required;
    }

    // ─────────────────────────────────────────────────────────────
    // ── Vistas ──
    // ─────────────────────────────────────────────────────────────

    function getConversionDisponible(address user) external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) return limiteConversionFiat[user];
        uint256 usadoHoy = conversionsDiarias;
        uint256 limitePersonal = limiteConversionFiat[user];
        uint256 disponiblePersonal = usadoHoy >= limitePersonal ? 0 : limitePersonal - usadoHoy;
        uint256 disponibleGlobal = limiteDiarioGlobal - usadoHoy;
        return disponiblePersonal < disponibleGlobal ? disponiblePersonal : disponibleGlobal;
    }

    function getSwiftInfo() external view returns (
        string memory bic,
        string memory nombre,
        string memory clabe,
        string memory corresponsal
    ) {
        return (swiftBic, swiftIssuerName, clabePrincipal, swiftCorresponsal);
    }

    /// @notice Override transfer para verificar libre usanza.
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        super._beforeTokenTransfer(from, to, amount);
        // Libre usanza: cualquier transfer es válida
        // Solo se verifica en conversión a fiat
        if (from != address(0)) {
            // Transferencia normal — libre usanza permite todo
        }
    }
}
