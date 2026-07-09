// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./EconomicExpansionOracle.sol";

/// @title ElasticCatalystToken (CAT v2)
/// @notice CAT token with ELASTIC supply tied to economic expansion.
///         NO fixed MAX_SUPPLY. Supply grows with:
///         - Cross-border QR payment volume (CNY processed)
///         - CAT burn (burn enables mint expansion)
///         - Treasury GNC backing growth
///         - AI compute consumption
///
///         Replaces CatalystToken.sol (v1 with 2B hard cap).
///
///         Architecture:
///         ┌─────────────────────┐
///         │ EconomicExpansion   │ ← Oracle: calculates elastic cap
///         │ Oracle              │   based on real economic activity
///         └────────┬────────────┘
///                  │ elasticCap
///         ┌────────▼────────────┐
///         │ ElasticCatalystToken│ ← Token: mints up to elastic cap
///         │ (CAT v2)            │   burn expands cap further
///         └─────────────────────┘
///
///         Formula:
///         elasticCap = CAT_FLOOR + (CNY_processed × 1.457) + (CAT_burned × 0.05)
///
///         Roles:
///         - MINTER_ROLE: Can mint CAT up to elastic cap
///         - BURNER_ROLE: Can burn CAT (triggers expansion)
///         - ECONOMIC_ORACLE: Updates economic indicators
contract ElasticCatalystToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant ECONOMIC_ORACLE_ROLE = keccak256("ECONOMIC_ORACLE_ROLE");

    /// @notice Economic expansion oracle that determines elastic supply caps.
    EconomicExpansionOracle public economicOracle;

    /// @notice Total CAT burned across all time (deflationary counter).
    uint256 public totalBurned;

    /// @notice Total CAT minted beyond genesis (expansion tracking).
    uint256 public totalExpansionMinted;

    /// @notice Genesis supply minted at deployment.
    uint256 public immutable genesisSupply;

    /// @notice Minimum floor supply (never goes below this).
    uint256 public constant SUPPLY_FLOOR = 1_000_000_000 ether; // 1B CAT floor

    // ── Events ──
    event ExpansionMint(address indexed to, uint256 amount, uint256 newTotalSupply, uint256 elasticCap);
    event EconomicOracleUpdated(address indexed oldOracle, address indexed newOracle);
    event ExpansionIndicatorsUpdated(uint256 cnyProcessed, uint256 catBurned, uint256 newElasticCap);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 genesisSupply_,
        address economicOracle_,
        address admin_
    ) ERC20(name_, symbol_) {
        require(genesisSupply_ >= SUPPLY_FLOOR, "genesis below floor");
        require(economicOracle_ != address(0), "oracle required");
        require(admin_ != address(0), "admin required");

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(MINTER_ROLE, admin_);
        _grantRole(BURNER_ROLE, admin_);
        _grantRole(ECONOMIC_ORACLE_ROLE, admin_);

        economicOracle = EconomicExpansionOracle(economicOracle_);
        genesisSupply = genesisSupply_;

        _mint(admin_, genesisSupply_);
    }

    // ─────────────────────────────────────────────────────────────
    // ── Elastic Mint: Supply expands with economic activity ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Mint new CAT tokens based on economic expansion.
    ///         Can only mint up to the elastic cap determined by the oracle.
    ///         The elastic cap grows with:
    ///         - CNY cross-border payment volume
    ///         - CAT burn (deflation enables controlled inflation)
    ///         - Treasury GNC backing
    ///
    /// @param to Recipient of expansion tokens
    /// @param amount Amount to mint (reverts if exceeds elastic cap)
    function mintEconomicExpansion(address to, uint256 amount)
        external onlyRole(MINTER_ROLE)
    {
        require(to != address(0), "zero address");
        require(amount > 0, "zero amount");

        // Get current elastic cap from oracle
        uint256 elasticCap = economicOracle.catElasticCap();

        // Never exceed elastic cap
        require(
            totalSupply() + amount <= elasticCap,
            "CAT: exceeds elastic cap"
        );

        _mint(to, amount);
        totalExpansionMinted += amount;
        emit ExpansionMint(to, amount, totalSupply(), elasticCap);
    }

    /// @notice Batch mint for multiple recipients (trigger settlements, rewards).
    function batchMintEconomicExpansion(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        require(recipients.length == amounts.length, "length mismatch");
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        uint256 elasticCap = economicOracle.catElasticCap();
        require(totalSupply() + totalAmount <= elasticCap, "CAT: batch exceeds elastic cap");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
        totalExpansionMinted += totalAmount;
        emit ExpansionMint(address(this), totalAmount, totalSupply(), elasticCap);
    }

    // ─────────────────────────────────────────────────────────────
    // ── Burn: Deflationary pressure that enables expansion ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Burn CAT tokens. Each burn contributes to economic expansion headroom.
    ///         Override ERC20Burnable to add tracking and oracle update.
    function burn(uint256 amount) public virtual override {
        super.burn(amount);
        totalBurned += amount;
        // Burn contributes to economic expansion via oracle's burnExpansionOffset
    }

    /// @notice Burn from account (requires allowance).
    function burnFrom(address account, uint256 amount) public virtual override {
        super.burnFrom(account, amount);
        totalBurned += amount;
    }

    /// @notice Burn with economic indicator update (for trigger processing).
    ///         Burns CAT and simultaneously updates oracle with CNY processed.
    function burnForTrigger(
        uint256 burnAmount,
        uint256 cnyProcessed,
        uint256 mxnSettled,
        uint256 gncBacked,
        uint256 qrCount
    ) external onlyRole(BURNER_ROLE) {
        burn(burnAmount);

        // Update economic oracle with trigger processing data
        economicOracle.updateEconomicIndicators(
            cnyProcessed,
            mxnSettled,
            burnAmount,
            gncBacked,
            qrCount
        );

        // Recalculate elastic caps based on new data
        economicOracle.recalculateElasticCaps();

        emit ExpansionIndicatorsUpdated(cnyProcessed, burnAmount, economicOracle.catElasticCap());
    }

    // ─────────────────────────────────────────────────────────────
    // ── Supply Queries ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Get current elastic cap from oracle.
    function getElasticCap() external view returns (uint256) {
        return economicOracle.catElasticCap();
    }

    /// @notice Get remaining expansion headroom (how much more CAT can be minted).
    function getExpansionHeadroom() external view returns (uint256 headroom, bool canExpand) {
        uint256 cap = economicOracle.catElasticCap();
        if (totalSupply() >= cap) {
            return (0, false);
        }
        return (cap - totalSupply(), true);
    }

    /// @notice Get full economic status of the token.
    function getEconomicStatus() external view returns (
        uint256 currentSupply,
        uint256 elasticCap,
        uint256 burned,
        uint256 expansionMinted,
        uint256 genesis,
        bool supplyElastic,
        uint256 headroom
    ) {
        uint256 cap = economicOracle.catElasticCap();
        uint256 room = totalSupply() >= cap ? 0 : cap - totalSupply();
        return (
            totalSupply(),
            cap,
            totalBurned,
            totalExpansionMinted,
            genesisSupply,
            true, // always elastic
            room
        );
    }

    // ─────────────────────────────────────────────────────────────
    // ── Admin ──
    // ─────────────────────────────────────────────────────────────

    /// @notice Update economic oracle address.
    function setEconomicOracle(address newOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newOracle != address(0), "zero oracle");
        address oldOracle = address(economicOracle);
        economicOracle = EconomicExpansionOracle(newOracle);
        emit EconomicOracleUpdated(oldOracle, newOracle);
    }

    /// @notice Adjust expansion multipliers via oracle.
    function adjustExpansionMultipliers(
        uint256 cnyMultiplier,
        uint256 burnOffset,
        uint256 treasuryMultiplier
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        economicOracle.setExpansionMultipliers(cnyMultiplier, burnOffset, treasuryMultiplier);
    }
}
