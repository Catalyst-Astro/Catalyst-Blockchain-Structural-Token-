// deploy_pool_sepolia.js — Uniswap V3 CAT/ETH pool on Sepolia
const { ethers } = require("hardhat");

// Sepolia addresses from our deployment
const CAT_ADDR = "0xD0BDAdf8618D487458e2AD3b6d6B1CfD884e7D72";
const WETH_ADDR = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const FACTORY_ADDR = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
const POSITION_MGR = "0x1238536071E1c677A632429e3655c799b22cDA52";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("ETH:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("CAT:", CAT_ADDR);
  console.log("WETH:", WETH_ADDR);

  // ── 1. Check if pool exists ──
  const factory = new ethers.Contract(FACTORY_ADDR, [
    "function getPool(address,address,uint24) view returns (address)",
    "function createPool(address,address,uint24) returns (address)",
  ], deployer);

  const FEE = 3000; // 0.3%
  const existing = await factory.getPool(CAT_ADDR, WETH_ADDR, FEE);
  console.log("\nExisting pool:", existing);

  if (existing !== ethers.ZeroAddress) {
    console.log("[OK] Pool already exists!");
    return;
  }

  // ── 2. Create pool ──
  console.log("\nCreating CAT/WETH pool at 0.3% fee...");
  const feeData = await ethers.provider.getFeeData();
  console.log("Gas price:", ethers.formatUnits(feeData.gasPrice || 0n, "gwei"), "gwei");

  try {
    const tx = await factory.createPool(CAT_ADDR, WETH_ADDR, FEE);
    const receipt = await tx.wait();
    console.log("[OK] Pool created!");
    console.log("TX:", tx.hash);
    console.log("Block:", receipt.blockNumber);
  } catch(e) {
    console.log("Create error:", e.message.slice(0,200));
    return;
  }

  // ── 3. Verify ──
  const poolAddr = await factory.getPool(CAT_ADDR, WETH_ADDR, FEE);
  console.log("\n========================================");
  console.log("  UNISWAP V3 POOL — SEPOLIA");
  console.log("========================================");
  console.log("CAT:", CAT_ADDR);
  console.log("WETH:", WETH_ADDR);
  console.log("Pool:", poolAddr);
  console.log("Fee: 0.3%");
  console.log("========================================");
  console.log("\nAdd liquidity: https://app.uniswap.org/pool/add?chain=sepolia");
  console.log("Pair: CAT + ETH");
  console.log("Initial price: 1 CAT = 0.00005 ETH (~$0.10 USD at $2000/ETH)");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
