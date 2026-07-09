// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./EconomicExpansionOracle.sol";

/// @title ElasticSupplyTokens
/// @notice GNC, CTV, AIM tokens with ELASTIC supply — NO fixed MAX_SUPPLY.
///         Supply expands with economic demand: CNY backing, AI compute, libre usanza.
///         All three tokens share the same EconomicExpansionOracle.

// ═══════════════════════════════════════════════════════════════
// ElasticGananciaToken (GNC v2)
// ═══════════════════════════════════════════════════════════════

/// @title ElasticGananciaToken (GNC v2)
/// @notice GNC token with elastic supply. 1 GNC = 1 CNY backed.
///         Supply expands 1:1 with CNY cross-border payment volume.
///         NO fixed cap — grows with treasury GNC backing.
contract ElasticGananciaToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant SWIFT_ISSUER = keccak256("SWIFT_ISSUER");
    bytes32 public constant TREASURY = keccak256("TREASURY");
    bytes32 public constant AUDITOR = keccak256("AUDITOR");

    EconomicExpansionOracle public economicOracle;

    bytes32 public backingProofHash;
    uint256 public totalCnyBacked;
    uint256 public totalCatBurned;
    uint256 public genesisSupply;

    uint256 public constant SUPPLY_FLOOR = 1_000_000 ether; // 1M GNC floor

    // CTV bridge
    address public tokenCautivo;
    uint256 public gncPerCautivo = 1000 ether;

    event GananciaAcunada(address indexed to, uint256 cnyBacked, uint256 gncMinted);
    event ElasticCapExpanded(uint256 newCap, uint256 totalCny);
    event CautivoLinked(address indexed tokenCautivo, uint256 rate);

    constructor(
        address swiftIssuer_,
        address treasury_,
        address economicOracle_,
        bytes32 backingProofHash_,
        uint256 totalCnyBacked_,
        uint256 totalCatBurned_
    ) ERC20("Ganancia Token", "GNC") {
        require(swiftIssuer_ != address(0), "swift issuer required");
        require(treasury_ != address(0), "treasury required");
        require(economicOracle_ != address(0), "oracle required");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SWIFT_ISSUER, swiftIssuer_);
        _grantRole(TREASURY, treasury_);
        _grantRole(AUDITOR, msg.sender);

        economicOracle = EconomicExpansionOracle(economicOracle_);
        backingProofHash = backingProofHash_;
        totalCnyBacked = totalCnyBacked_;
        totalCatBurned = totalCatBurned_;
        genesisSupply = 0; // Minted on demand
    }

    /// @notice Acuña GNC respaldados por ganancias verificadas.
    ///         Supply expands 1:1 with CNY backing. NO fixed cap.
    ///         Elastic cap from oracle acts as soft guideline, not hard limit.
    function acunarGanancia(address to, uint256 cnyAmount, bytes32 proofHash)
        external onlyRole(SWIFT_ISSUER) returns (uint256)
    {
        require(cnyAmount > 0, "amount required");
        require(proofHash != bytes32(0), "proof required");

        // Elastic check: oracle provides guidance cap but 1:1 backing always valid
        uint256 elasticCap = economicOracle.gncElasticCap();
        if (totalSupply() + cnyAmount > elasticCap) {
            // Auto-expand oracle cap to accommodate real economic demand
            economicOracle.recalculateElasticCaps();
        }

        _mint(to, cnyAmount);
        totalCnyBacked += cnyAmount;

        // Update oracle with new backing
        economicOracle.updateEconomicIndicators(cnyAmount, 0, 0, cnyAmount, 0);

        emit GananciaAcunada(to, cnyAmount, cnyAmount);
        return cnyAmount;
    }

    function vincularCautivo(address cautivo_, uint256 rate_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(cautivo_ != address(0), "cautivo required");
        tokenCautivo = cautivo_;
        gncPerCautivo = rate_;
        emit CautivoLinked(cautivo_, rate_);
    }

    function convertirACautivo(uint256 gncAmount) external returns (uint256) {
        require(tokenCautivo != address(0), "cautivo not linked");
        require(balanceOf(msg.sender) >= gncAmount, "insufficient GNC");
        require(gncAmount >= gncPerCautivo, "below minimum");
        uint256 cautivoAmount = (gncAmount * 1 ether) / gncPerCautivo;
        _burn(msg.sender, gncAmount);
        IElasticCautivo(tokenCautivo).mintLibreUsanza(msg.sender, cautivoAmount);
        return cautivoAmount;
    }

    function verifyBacking(bytes32 proofHash) external onlyRole(AUDITOR) {
        backingProofHash = proofHash;
    }

    function getBackingRatio() external view returns (uint256) {
        if (totalSupply() == 0) return 1 ether;
        return (totalCnyBacked * 1 ether) / totalSupply();
    }

    function getElasticCap() external view returns (uint256) {
        return economicOracle.gncElasticCap();
    }
}

interface IElasticCautivo {
    function mintLibreUsanza(address to, uint256 amount) external;
}


// ═══════════════════════════════════════════════════════════════
// ElasticTokenCautivo (CTV v2)
// ═══════════════════════════════════════════════════════════════

/// @title ElasticTokenCautivo (CTV v2)
/// @notice CTV token with elastic supply. Cautivo = vinculado a SWIFT emisora.
///         Libre usanza = portador opera libremente una vez acuñado.
///         Supply expands with GNC conversion demand. NO fixed cap.
contract ElasticTokenCautivo is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant GANANCIA_BRIDGE = keccak256("GANANCIA_BRIDGE");
    bytes32 public constant SWIFT_ISSUER = keccak256("SWIFT_ISSUER");
    bytes32 public constant COMPLIANCE_OFFICER = keccak256("COMPLIANCE_OFFICER");

    EconomicExpansionOracle public economicOracle;

    string public swiftBic = "BCRMXMMPYM";
    string public swiftIssuerName = "BBVA Mexico S.A.";
    string public clabePrincipal = "012290015202390246";
    string public swiftCorresponsal = "UNPYCNBH";

    mapping(address => bool) public libreUsanzaActiva;
    mapping(address => uint256) public limiteConversionFiat;
    uint256 public limiteDiarioGlobal = 1_000_000 ether;
    uint256 public conversionsDiarias;
    uint256 public lastResetDay;

    address public complianceRegistry;
    bool public complianceRequired = true;

    uint256 public genesisSupply;

    event LibreUsanzaAcunada(address indexed to, uint256 amount, address indexed bridge);
    event ConversionAFiat(address indexed user, uint256 ctvAmount, string swiftRef);

    constructor(
        address admin_,
        address swiftIssuer_,
        address gananciaBridge_,
        address economicOracle_,
        string memory swiftBic_,
        string memory clabe_
    ) ERC20("Token Cautivo", "CTV") {
        require(admin_ != address(0), "admin required");
        require(swiftIssuer_ != address(0), "swift issuer required");
        require(gananciaBridge_ != address(0), "bridge required");

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(SWIFT_ISSUER, swiftIssuer_);
        _grantRole(GANANCIA_BRIDGE, gananciaBridge_);
        _grantRole(COMPLIANCE_OFFICER, admin_);

        economicOracle = EconomicExpansionOracle(economicOracle_);
        swiftBic = swiftBic_;
        clabePrincipal = clabe_;
        lastResetDay = block.timestamp / 1 days;

        libreUsanzaActiva[admin_] = true;
        limiteConversionFiat[admin_] = 100_000 ether;
        genesisSupply = 0;
    }

    /// @notice Acuña CTV desde GNC bridge. Supply elástica — sin límite fijo.
    function mintLibreUsanza(address to, uint256 amount)
        external onlyRole(GANANCIA_BRIDGE)
    {
        // Elastic cap check via oracle
        uint256 elasticCap = economicOracle.ctvElasticCap();
        if (totalSupply() + amount > elasticCap) {
            economicOracle.recalculateElasticCaps();
        }

        _mint(to, amount);
        libreUsanzaActiva[to] = true;
        emit LibreUsanzaAcunada(to, amount, msg.sender);
    }

    function activarLibreUsanza(address user, uint256 limiteDiario)
        external onlyRole(COMPLIANCE_OFFICER)
    {
        libreUsanzaActiva[user] = true;
        limiteConversionFiat[user] = limiteDiario;
    }

    function convertirAFiat(uint256 ctvAmount, string calldata clabeDestino)
        external returns (bytes32 swiftRef)
    {
        require(libreUsanzaActiva[msg.sender], "libre usanza no activa");
        require(balanceOf(msg.sender) >= ctvAmount, "insufficient CTV");
        require(ctvAmount > 0, "amount required");

        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            conversionsDiarias = 0;
            lastResetDay = today;
        }
        require(ctvAmount <= limiteConversionFiat[msg.sender], "excede limite personal");
        require(conversionsDiarias + ctvAmount <= limiteDiarioGlobal, "excede limite global");

        _burn(msg.sender, ctvAmount);
        conversionsDiarias += ctvAmount;

        swiftRef = keccak256(abi.encodePacked(
            swiftBic, clabeDestino, msg.sender, ctvAmount, block.timestamp
        ));
        emit ConversionAFiat(msg.sender, ctvAmount, string(abi.encodePacked(swiftRef)));
        return swiftRef;
    }

    function setLimiteDiarioGlobal(uint256 newLimit) external onlyRole(SWIFT_ISSUER) {
        limiteDiarioGlobal = newLimit;
    }

    function getSwiftInfo() external view returns (
        string memory bic, string memory nombre, string memory clabe, string memory corresponsal
    ) {
        return (swiftBic, swiftIssuerName, clabePrincipal, swiftCorresponsal);
    }

    function getElasticCap() external view returns (uint256) {
        return economicOracle.ctvElasticCap();
    }
}


// ═══════════════════════════════════════════════════════════════
// ElasticAIMToken (AIM v2)
// ═══════════════════════════════════════════════════════════════

/// @title ElasticAIMToken (AIM v2)
/// @notice AIM token with elastic supply. 1 AIM ≈ $0.01 USD AI compute.
///         Supply expands with AI compute demand. NO fixed cap.
///         Minted when users pay CAT for AI compute.
///         Burned when AI compute is consumed.
contract ElasticAIMToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant METER_ROLE = keccak256("METER_ROLE");

    EconomicExpansionOracle public economicOracle;
    uint256 public totalAIBurned;
    uint256 public genesisSupply;

    event AIMPurchased(address indexed user, uint256 catPaid, uint256 aimReceived);
    event AIMConsumed(address indexed user, address indexed provider, uint256 aimAmount, bytes32 serviceId);

    constructor(address economicOracle_) ERC20("AI Module Token", "AIM") {
        require(economicOracle_ != address(0), "oracle required");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(METER_ROLE, msg.sender);
        economicOracle = EconomicExpansionOracle(economicOracle_);
        genesisSupply = 0;
    }

    /// @notice Mint AIM — elastic supply tied to AI compute demand.
    ///         NO fixed cap. Oracle tracks AI consumption for elastic expansion.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        // Elastic check — auto-expand if needed
        uint256 elasticCap = economicOracle.aimElasticCap();
        if (totalSupply() + amount > elasticCap) {
            economicOracle.recalculateElasticCaps();
        }
        _mint(to, amount);
    }

    /// @notice Consume AIM for AI compute. Only METER_ROLE.
    function consume(address from, uint256 amount) external onlyRole(METER_ROLE) {
        _burn(from, amount);
        totalAIBurned += amount;
        economicOracle.updateAIConsumption(amount);
    }

    /// @notice User pays for AI compute directly by burning AIM.
    function payForAI(uint256 amount) external {
        _burn(msg.sender, amount);
        totalAIBurned += amount;
        economicOracle.updateAIConsumption(amount);
        emit AIMConsumed(msg.sender, address(0), amount, bytes32(0));
    }

    function totalAIComputeConsumed() external view returns (uint256) {
        return totalAIBurned;
    }

    function getElasticCap() external view returns (uint256) {
        return economicOracle.aimElasticCap();
    }
}
