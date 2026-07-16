// deploy_bondingcurve.js — Deploy BondingCurveMarket to Base Mainnet
// Strategy: CAT-only launch. No ETH liquidity needed upfront.
// Buyers send ETH → receive CAT. ETH accumulates → enables sellCAT().
// BELL 13450.50 · Pentetraktys 4D

const hre = require("hardhat");
const { ethers } = hre;

// ─── Base Mainnet Constants ──────────────────────────────────────────
const CAT_ADDRESS = "0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80";
const WETH_BASE = "0x4200000000000000000000000000000000000006";

// 1 CAT = $1.6184 MXN → 0.0000294 ETH (at ETH=$3150, USD/MXN=$17.48)
// CAT_USD = 1.6184 / 17.4758 = 0.09261
// CAT_ETH = 0.09261 / 3150 = 0.0000294
// Price in wei: 0.0000294 * 1e18 = 29400000000000
const INITIAL_PRICE = ethers.parseUnits("0.0000294", 18);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  BONDING CURVE MARKET — BASE MAINNET     ║");
  console.log("║  BELL 13450.50 · CAT-only Launch         ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`\nDeployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`\nCAT:      ${CAT_ADDRESS}`);
  console.log(`WETH:     ${WETH_BASE}`);
  console.log(`Price:    1 CAT = 0.0000294 ETH ($1.6184 MXN)`);
  console.log(`Spread:   1%  |  Fee: 0.5%  |  Curve: k=5`);
  console.log(`\n`);

  // ─── Deploy ──────────────────────────────────────────────────────
  console.log("Deploying BondingCurveMarket...");
  const BondingCurveMarket = await ethers.getContractFactory("BondingCurveMarket");
  const market = await BondingCurveMarket.deploy(CAT_ADDRESS, WETH_BASE, INITIAL_PRICE);
  await market.waitForDeployment();

  const marketAddr = await market.getAddress();
  console.log(`\n✅ Deployed: ${marketAddr}`);
  console.log(`   BaseScan: https://basescan.org/address/${marketAddr}`);
  console.log(`\n`);

  // ─── Verify params ───────────────────────────────────────────────
  const bp = await market.basePrice();
  const spread = await market.spreadBps();
  const curveK = await market.curveK();
  const fee = await market.feeBps();
  console.log(`Params verified:`);
  console.log(`  basePrice:  ${ethers.formatUnits(bp, 18)} ETH/CAT`);
  console.log(`  spreadBps:  ${spread} (${Number(spread)/100}%)`);
  console.log(`  curveK:     ${curveK}`);
  console.log(`  feeBps:     ${fee} (${Number(fee)/100}%)`);
  console.log(`\n`);

  // ─── Next steps ──────────────────────────────────────────────────
  console.log(`NEXT STEPS:`);
  console.log(`  1. Deposit CAT into market:`);
  console.log(`     npx hardhat run scripts/fund_bondingcurve.js --network base`);
  console.log(`  2. Verify on BaseScan:`);
  console.log(`     npx hardhat verify --network base ${marketAddr} ${CAT_ADDRESS} ${WETH_BASE} ${INITIAL_PRICE}`);
  console.log(`\n`);

  return marketAddr;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
