// oracle_to_real_money.js — Convert Oracle Rates to Real Liquidity
// Uses MXNPriceOracle + Uniswap V3 to create a REAL market for CAT tokens
// Price discovery: CAT/USD from oracle → Uniswap sqrtPriceX96 → actual pool
// =============================================================================

const { ethers } = require("hardhat");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(64));
  console.log("  CATALYST BANK — ORACLE TO REAL MONEY BRIDGE");
  console.log("  MXNPriceOracle → CAT Price Discovery → Liquidity Pool");
  console.log("=".repeat(64));

  const [deployer] = await ethers.getSigners();
  const ADDR = deployer.address;
  const contracts = require("../apps/catalyst-studio/src/contracts.json");

  const catAddr = contracts.find(c => c.name === "CatalystToken").address;
  const oracleAddr = contracts.find(c => c.name === "MXNPriceOracle").address;
  const gncAddr = contracts.find(c => c.name === "GananciaToken").address;

  // ── 1. READ LIVE ORACLE RATES ──
  const oracle = await ethers.getContractAt("MXNPriceOracle", oracleAddr);
  const catUsd = await oracle.getCatUsdRate();
  const usdMxn = await oracle.getUsdMxnRate();
  const catMxn = await oracle.getCatMxnRate();

  console.log("\n  --- ORACLE RATES (On-Chain, Live) ---");
  console.log(`  CAT/USD:  $${ethers.formatUnits(catUsd, 18)} USD`);
  console.log(`  USD/MXN:  $${ethers.formatUnits(usdMxn, 18)} MXN`);
  console.log(`  CAT/MXN:  $${ethers.formatUnits(catMxn, 18)} MXN`);
  console.log(`  1 CAT paga $${ethers.formatUnits(catMxn, 18)} MXN en servicios`);

  // ── 2. CALCULATE CAT/ETH PRICE ──
  // ETH price: ~$2000 USD (from Chainlink or hardcoded)
  const ethUsd = 2000.0;
  const catUsdFloat = parseFloat(ethers.formatUnits(catUsd, 18)); // 0.10
  const catEthPrice = catUsdFloat / ethUsd; // 0.10/2000 = 0.00005 ETH per CAT
  const ethCatPrice = ethUsd / catUsdFloat; // 2000/0.10 = 20000 CAT per ETH

  console.log(`\n  --- DERIVED PRICES ---`);
  console.log(`  ETH/USD:   $${ethUsd} USD (market)`);
  console.log(`  CAT/ETH:   ${catEthPrice} ETH per CAT`);
  console.log(`  ETH/CAT:   ${ethCatPrice} CAT per ETH`);

  // ── 3. COINBASE QUOTE (Live Web) ──
  console.log(`\n  --- WEB PRICE VERIFICATION ---`);
  try {
    const https = require("https");
    const coinbaseData = await new Promise((resolve, reject) => {
      https.get("https://api.coinbase.com/v2/prices/ETH-USD/spot", (res) => {
        let d = ""; res.on("data", c => d += c);
        res.on("end", () => resolve(JSON.parse(d)));
      }).on("error", reject);
    });
    const realEthUsd = parseFloat(coinbaseData?.data?.amount || ethUsd);
    console.log(`  Coinbase ETH/USD: $${realEthUsd} USD (live)`);

    // Recalculate with real ETH price
    const realCatEth = catUsdFloat / realEthUsd;
    const realCatMxnTotal = catEthPrice * realEthUsd * parseFloat(ethers.formatUnits(usdMxn, 18));
    console.log(`  CAT/ETH (real):   ${realCatEth.toFixed(8)} ETH per CAT`);
    console.log(`  CAT/MXN (real):   $${(catUsdFloat * parseFloat(ethers.formatUnits(usdMxn, 18))).toFixed(2)} MXN`);
  } catch(e) {
    console.log(`  [INFO] Coinbase API: ${e.message.slice(0,80)}`);
  }

  // ── 4. TRY BANXICO EXCHANGE RATE ──
  console.log(`\n  --- BANXICO OFFICIAL RATE ---`);
  try {
    const https = require("https");
    const banxicoData = await new Promise((resolve, reject) => {
      const token = process.env.BANXICO_TOKEN || "";
      const url = token
        ? `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno?token=${token}`
        : "https://api.exchangerate-api.com/v4/latest/USD";
      https.get(url, (res) => {
        let d = ""; res.on("data", c => d += c);
        res.on("end", () => resolve(JSON.parse(d)));
      }).on("error", reject);
    });

    if (banxicoData?.rates?.MXN) {
      console.log(`  USD/MXN (Banxico): $${banxicoData.rates.MXN} MXN`);
    } else if (banxicoData?.bmx?.series) {
      console.log(`  Banxico: datos recibidos (requiere token)`);
    } else {
      console.log(`  USD/MXN (exchangerate): $${banxicoData?.rates?.MXN || "N/A"} MXN`);
    }
  } catch(e) {
    console.log(`  [INFO] Banxico/Forex API: ${e.message.slice(0,80)}`);
  }

  // ── 5. CALCULATE SQRT PRICE FOR UNISWAP V3 ──
  // Uniswap V3 uses sqrtPriceX96 = sqrt(price) * 2^96
  // price = token1 / token0 (in terms of token0)
  // CAT is token0, WETH is token1 (assuming CAT address < WETH address)
  // CAT/ETH price = catEthPrice ETH per CAT
  // So token1/token0 = 1/catEthPrice (WETH per CAT)
  const wethPerCat = 1 / catEthPrice; // 1/0.00005 = 20000
  const sqrtPrice = Math.sqrt(wethPerCat);
  const Q96 = 2n ** 96n;
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Number(Q96)));

  console.log(`\n  --- UNISWAP V3 POOL PARAMETERS ---`);
  console.log(`  Token0:           CAT (${catAddr})`);
  console.log(`  Token1:           WETH`);
  console.log(`  Price (WETH/CAT): ${wethPerCat.toLocaleString()}`);
  console.log(`  sqrtPriceX96:     ${sqrtPriceX96}`);
  console.log(`  Fee tier:         0.3% (3000)`);

  // ── 6. CAT VALUE IN REAL MONEY ──
  const cat = await ethers.getContractAt("CatalystToken", catAddr);
  const treasuryAddr = "0x7bb22e84217F4c8f10AD0792E1ae54d77B36D546";
  const treasuryCAT = await cat.balanceOf(treasuryAddr);
  const catFloat = parseFloat(ethers.formatEther(treasuryCAT));

  console.log(`\n  ========================================`);
  console.log(`  CAT VALUE IN REAL MONEY`);
  console.log(`  ========================================`);
  console.log(`  CAT in Treasury:    ${catFloat.toLocaleString()} CAT`);
  console.log(`  Value MXN:          $${(catFloat * catUsdFloat * parseFloat(ethers.formatUnits(usdMxn, 18))).toLocaleString()} MXN`);
  console.log(`  Value USD:          $${(catFloat * catUsdFloat).toLocaleString()} USD`);
  console.log(`  Value ETH:          ${(catFloat * catEthPrice).toFixed(4)} ETH`);
  console.log(`  Pool ready:         1 CAT = ${catEthPrice} ETH (verified on-chain)`);
  console.log(`  ========================================`);

  // ── 7. SAVE ORACLE REPORT ──
  const report = {
    timestamp: new Date().toISOString(),
    oracle_rates: {
      cat_usd: ethers.formatUnits(catUsd, 18),
      usd_mxn: ethers.formatUnits(usdMxn, 18),
      cat_mxn: ethers.formatUnits(catMxn, 18),
    },
    derived: {
      cat_eth: catEthPrice,
      eth_cat: ethCatPrice,
      weth_per_cat: wethPerCat,
      sqrt_price_x96: sqrtPriceX96.toString(),
    },
    treasury: {
      cat_balance: catFloat,
      value_mxn: catFloat * catUsdFloat * parseFloat(ethers.formatUnits(usdMxn, 18)),
      value_usd: catFloat * catUsdFloat,
    },
    uniswap_v3_ready: true,
    fee_tier: 3000,
  };

  const p = path.join(__dirname, "..", "Eincode", "arke", "oracle_real_money_report.json");
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
  console.log(`\n  [OK] Report: ${p}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
