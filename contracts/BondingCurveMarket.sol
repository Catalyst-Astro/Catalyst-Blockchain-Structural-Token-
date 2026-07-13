// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BondingCurveMarket
 * @notice Market maker que vende y compra CAT a precio fijo Banxico.
 *         Usa una bonding curve SUAVE: el precio se mueve ±1% por cada
 *         1% del supply transado, no con cada swap microscópico como Uniswap.
 *
 *         Precio base: 1 CAT = $1.6184 MXN = 0.0000294 ETH
 *         Spread: 1% (compra 1% bajo, vende 1% arriba)
 *         Curve: P = P_base * (1 + k * (supply_vendido / supply_total))
 *
 *         El owner actualiza el precio base vía Chainlink/Banxico oracle.
 */
contract BondingCurveMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable catToken;
    address public immutable weth;

    // ── Pricing (18 decimals) ──
    uint256 public basePrice;        // CAT/ETH * 1e18  (ej: 0.0000294 ETH)
    uint256 public spreadBps = 100;  // 1% = 100 bps
    uint256 public curveK = 5;       // curva: priceMove = k * volumeRatio (5 = suave)
    uint256 public totalSold;        // CAT vendido acumulado
    uint256 public totalBought;      // CAT comprado acumulado

    // ── Limits ──
    uint256 public maxOrderCAT = 100_000 ether; // Max 100k CAT por orden
    uint256 public minOrderCAT = 1 ether;       // Min 1 CAT por orden

    // ── Fees ──
    uint256 public feeBps = 50;      // 0.5% fee para el treasury
    uint256 public accumulatedFees;  // ETH acumulado en fees

    // ── Events ──
    event Bought(address indexed buyer, uint256 catAmount, uint256 ethPaid, uint256 price);
    event Sold(address indexed seller, uint256 catAmount, uint256 ethReceived, uint256 price);
    event PriceUpdated(uint256 newBasePrice, string source);
    event FeesWithdrawn(uint256 ethAmount, address to);

    constructor(address cat_, address weth_, uint256 initialPrice_) {
        require(cat_ != address(0) && weth_ != address(0), "zero address");
        catToken = IERC20(cat_);
        weth = weth_;
        basePrice = initialPrice_; // 29400000000000 = 0.0000294 ETH con 18 decimals
    }

    // ═══════════════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════════════

    /// @notice Precio actual de compra (CAT→ETH, con spread)
    function buyPrice() public view returns (uint256) {
        uint256 volumeRatio = (totalSold * 1e18) / (catToken.totalSupply() + 1);
        uint256 adjustment = (curveK * volumeRatio) / 100;
        return basePrice * (10000 + spreadBps + adjustment) / 10000;
    }

    /// @notice Precio actual de venta (ETH→CAT, con spread inverso)
    function sellPrice() public view returns (uint256) {
        uint256 volumeRatio = (totalBought * 1e18) / (catToken.totalSupply() + 1);
        uint256 adjustment = (curveK * volumeRatio) / 100;
        return basePrice * (10000 - spreadBps - adjustment) / 10000;
    }

    /// @notice Cuánto ETH necesitas para comprar X CAT
    function getBuyQuote(uint256 catAmount) public view returns (uint256 ethNeeded) {
        require(catAmount >= minOrderCAT && catAmount <= maxOrderCAT, "amount out of range");
        ethNeeded = (catAmount * buyPrice()) / 1e18;
    }

    /// @notice Cuánto ETH recibes por vender X CAT
    function getSellQuote(uint256 catAmount) public view returns (uint256 ethReceived) {
        require(catAmount >= minOrderCAT && catAmount <= maxOrderCAT, "amount out of range");
        ethReceived = (catAmount * sellPrice()) / 1e18;
    }

    // ═══════════════════════════════════════════════════════
    // BUY CAT (user sends ETH, receives CAT)
    // ═══════════════════════════════════════════════════════

    function buyCAT(uint256 minCAT) external payable nonReentrant returns (uint256 catBought) {
        require(msg.value > 0, "send ETH");

        uint256 price = buyPrice();
        catBought = (msg.value * 1e18) / price;

        require(catBought >= minCAT, "slippage");
        require(catBought >= minOrderCAT && catBought <= maxOrderCAT, "amount out of range");

        // Fee
        uint256 fee = (msg.value * feeBps) / 10000;
        accumulatedFees += fee;
        uint256 netEth = msg.value - fee;

        // Transfer CAT to buyer
        require(catToken.balanceOf(address(this)) >= catBought, "insufficient CAT in market");
        catToken.safeTransfer(msg.sender, catBought);
        totalSold += catBought;

        emit Bought(msg.sender, catBought, netEth, price);
    }

    // ═══════════════════════════════════════════════════════
    // SELL CAT (user sends CAT, receives ETH)
    // ═══════════════════════════════════════════════════════

    function sellCAT(uint256 catAmount, uint256 minETH) external nonReentrant returns (uint256 ethPaid) {
        require(catAmount >= minOrderCAT && catAmount <= maxOrderCAT, "amount out of range");

        uint256 price = sellPrice();
        ethPaid = (catAmount * price) / 1e18;
        require(ethPaid >= minETH, "slippage");

        // Fee
        uint256 fee = (ethPaid * feeBps) / 10000;
        accumulatedFees += fee;
        uint256 netEth = ethPaid - fee;

        require(address(this).balance >= netEth, "insufficient ETH in market");
        catToken.safeTransferFrom(msg.sender, address(this), catAmount);
        totalBought += catAmount;

        (bool ok, ) = msg.sender.call{value: netEth}("");
        require(ok, "ETH transfer failed");

        emit Sold(msg.sender, catAmount, netEth, price);
    }

    // ═══════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════

    /// @notice Actualizar precio base (llamado por oracle Banxico)
    function updateBasePrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "zero price");
        basePrice = newPrice;
        emit PriceUpdated(newPrice, "banxico-oracle");
    }

    /// @notice Ajustar parámetros de la curva
    function setParams(uint256 spread_, uint256 k_, uint256 fee_, uint256 maxOrder_) external onlyOwner {
        require(spread_ <= 500 && k_ <= 50 && fee_ <= 300, "params too high");
        spreadBps = spread_;
        curveK = k_;
        feeBps = fee_;
        maxOrderCAT = maxOrder_;
    }

    /// @notice Depositar CAT al market (owner inyecta liquidez)
    function depositCAT(uint256 amount) external onlyOwner {
        catToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @notice Retirar fees acumulados
    function withdrawFees(address to) external onlyOwner {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit FeesWithdrawn(amount, to);
    }

    /// @notice Retirar CAT no usado
    function withdrawCAT(address to, uint256 amount) external onlyOwner {
        catToken.safeTransfer(to, amount);
    }

    // Receive ETH
    receive() external payable {}
}
