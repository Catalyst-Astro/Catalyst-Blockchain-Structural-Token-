// =============================================================================
// create_pool.js — Create Uniswap V3 CAT/ETH pool on Sepolia testnet
// =============================================================================
// Prerequisites:
//   1. Run deploy_core.js --network sepolia
//   2. Run deploy_distribution.js --network sepolia
//   3. Fund deployer with Sepolia ETH (faucet)
//   4. Wrap ETH to WETH (this script handles it)
//
// Usage:
//   npx hardhat run scripts/create_pool.js --network sepolia
// =============================================================================

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ── Uniswap V3 Canonical Addresses (Sepolia) ──
const UNISWAP = {
  factory:              "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
  swapRouter:           "0x3bFA4769FB09eEfC5a80d6E87c3B9C650f7Ae48E",
  positionManager:      "0x1238536071E1c677A632429e3655c799b22cDA52",
  weth9:                "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  quoter:               "0xEd1f6473345F45C75F7359dd6Dfc1c21d3B36b50",
};

// ── Minimal ABIs ──
const WETH_ABI = ["function deposit() payable", "function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"];

const FACTORY_ABI = [
  "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
];

const POSITION_MANAGER_ABI = [
  "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)",
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// ── Pool parameters ──
const POOL_FEE = 3000;               // 0.3% fee tier
const CAT_PRICE_USD_TARGET = 0.10;   // initial target: $0.10 per CAT
const ETH_PRICE_USD = 3000;          // ~current ETH price (adjust)
const LIQUIDITY_CAT = ethers.parseEther("50000000"); // 50M CAT for initial LP (half of 100M)
const LIQUIDITY_ETH = ethers.parseEther(
  ((Number(LIQUIDITY_CAT) / 1e18) * CAT_PRICE_USD_TARGET / ETH_PRICE_USD).toFixed(6)
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n  Deployer: ${deployer.address}`);
  const ethBal = await ethers.provider.getBalance(deployer.address);
  console.log(`  ETH:      ${ethers.formatEther(ethBal)}`);
  console.log(`  WETH needed: ~${ethers.formatEther(LIQUIDITY_ETH)} (for initial LP)\n`);

  // ── Load CAT address ──
  const contractsPath = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts.json");
  let contracts;
  try {
    contracts = JSON.parse(fs.readFileSync(contractsPath, "utf-8"));
  } catch {
    console.error("  ✗ contracts.json not found. Run deploy_core.js first.");
    process.exit(1);
  }
  const catAddr = contracts.find((c) => c.name === "CatalystToken")?.address;
  if (!catAddr) { console.error("  ✗ CatalystToken not found"); process.exit(1); }
  console.log(`  CAT: ${catAddr}`);

  // ── Contracts ──
  const weth = new ethers.Contract(UNISWAP.weth9, WETH_ABI, deployer);
  const factory = new ethers.Contract(UNISWAP.factory, FACTORY_ABI, deployer);
  const positionManager = new ethers.Contract(UNISWAP.positionManager, POSITION_MANAGER_ABI, deployer);
  const cat = new ethers.Contract(catAddr, ERC20_ABI, deployer);

  // ── 1. Check if pool already exists ──
  console.log("── 1. Checking existing pool ──");
  let poolAddr;
  try {
    poolAddr = await factory.getPool(catAddr, UNISWAP.weth9, POOL_FEE);
  } catch (e) {
    poolAddr = ethers.ZeroAddress;
  }
  if (poolAddr && poolAddr !== ethers.ZeroAddress) {
    console.log(`  ⚠ Pool already exists: ${poolAddr}`);
  } else {
    // ── 2. Determine token order (CAT < WETH?) ──
    const token0 = catAddr.toLowerCase() < UNISWAP.weth9.toLowerCase() ? catAddr : UNISWAP.weth9;
    const token1 = catAddr.toLowerCase() < UNISWAP.weth9.toLowerCase() ? UNISWAP.weth9 : catAddr;
    console.log(`  Token0: ${token0 === catAddr ? "CAT" : "WETH"}`);
    console.log(`  Token1: ${token1 === catAddr ? "CAT" : "WETH"}`);

    // ── 3. Wrap ETH to WETH ──
    console.log(`\n── 2. Wrapping ${ethers.formatEther(LIQUIDITY_ETH)} ETH → WETH ──`);
    const wethBefore = await weth.balanceOf(deployer.address);
    const tx1 = await weth.deposit({ value: LIQUIDITY_ETH });
    await tx1.wait();
    const wethAfter = await weth.balanceOf(deployer.address);
    console.log(`  ✓ WETH balance: ${ethers.formatEther(wethBefore)} → ${ethers.formatEther(wethAfter)}`);

    // ── 4. Calculate initial sqrtPriceX96 ──
    // Price = CAT/ETH = 0.10 / 3000 = 0.00003333 ETH per CAT
    // sqrtPriceX96 = sqrt(price) * 2^96
    const priceRatio = CAT_PRICE_USD_TARGET / ETH_PRICE_USD;
    const sqrtPrice = Math.sqrt(priceRatio);
    const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * (2 ** 96)));
    console.log(`  Initial price: ~$${CAT_PRICE_USD_TARGET} / CAT (${priceRatio.toFixed(8)} ETH/CAT)`);
    console.log(`  sqrtPriceX96:  ${sqrtPriceX96.toString().slice(0, 20)}...`);

    // ── 5. Create + initialize pool ──
    console.log(`\n── 3. Creating Uniswap V3 Pool (0.3% fee) ──`);
    const tx2 = await positionManager.createAndInitializePoolIfNecessary(
      token0, token1, POOL_FEE, sqrtPriceX96
    );
    await tx2.wait();
    poolAddr = await factory.getPool(catAddr, UNISWAP.weth9, POOL_FEE);
    console.log(`  ✓ Pool created: ${poolAddr}`);

    // Wait for pool to be fully initialized
    await sleep(5000);
  }

  // ── 6. Approve tokens ──
  console.log(`\n── 4. Adding Liquidity ──`);
  console.log(`  CAT: ${ethers.formatEther(LIQUIDITY_CAT)}`);
  console.log(`  WETH: ${ethers.formatEther(LIQUIDITY_ETH)}`);

  // Check allowance and approve CAT
  const catAllowance = await cat.allowance(deployer.address, UNISWAP.positionManager);
  if (catAllowance < LIQUIDITY_CAT) {
    console.log("  Approving CAT...");
    const tx3 = await cat.approve(UNISWAP.positionManager, ethers.MaxUint256);
    await tx3.wait();
    console.log("  ✓ CAT approved");
  }

  // Check allowance and approve WETH
  const wethAllowance = await weth.allowance(deployer.address, UNISWAP.positionManager);
  if (wethAllowance < LIQUIDITY_ETH) {
    console.log("  Approving WETH...");
    const tx4 = await weth.approve(UNISWAP.positionManager, ethers.MaxUint256);
    await tx4.wait();
    console.log("  ✓ WETH approved");
  }

  // ── 7. Mint LP position ──
  // Full range position (tickLower = MIN_TICK, tickUpper = MAX_TICK)
  const MIN_TICK = -887272;
  const MAX_TICK = 887272;
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

  console.log(`\n  Minting full-range LP position...`);
  const tx5 = await positionManager.mint({
    token0: catAddr.toLowerCase() < UNISWAP.weth9.toLowerCase() ? catAddr : UNISWAP.weth9,
    token1: catAddr.toLowerCase() < UNISWAP.weth9.toLowerCase() ? UNISWAP.weth9 : catAddr,
    fee: POOL_FEE,
    tickLower: MIN_TICK,
    tickUpper: MAX_TICK,
    amount0Desired: catAddr.toLowerCase() < UNISWAP.weth9.toLowerCase() ? LIQUIDITY_CAT : LIQUIDITY_ETH,
    amount1Desired: catAddr.toLowerCase() < UNISWAP.weth9.toLowerCase() ? LIQUIDITY_ETH : LIQUIDITY_CAT,
    amount0Min: 0,
    amount1Min: 0,
    recipient: deployer.address,
    deadline: deadline,
  });
  const receipt = await tx5.wait();
  console.log(`  ✓ LP position minted! TX: ${receipt.hash}`);

  // ── Summary ──
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  UNISWAP V3 POOL READY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Network:     Sepolia Testnet`);
  console.log(`  Pool:        ${poolAddr}`);
  console.log(`  CAT:         ${catAddr}`);
  console.log(`  WETH:        ${UNISWAP.weth9}`);
  console.log(`  Fee Tier:    0.3%`);
  console.log(`  Initial CAT: ${ethers.formatEther(LIQUIDITY_CAT)}`);
  console.log(`  Initial WETH: ${ethers.formatEther(LIQUIDITY_ETH)}`);
  console.log(`  Target Price: $${CAT_PRICE_USD_TARGET} / CAT`);
  console.log(`\n  Add CAT token to MetaMask:`);
  console.log(`    Token Address: ${catAddr}`);
  console.log(`    Symbol:        CAT`);
  console.log(`    Decimals:      18`);
  console.log(`\n  Swap on Uniswap (Sepolia):`);
  console.log(`    https://app.uniswap.org/swap?chain=sepolia`);
  console.log(`    Import token: ${catAddr}`);
  console.log();

  // ── Save pool address ──
  contracts.push({ name: "UniswapV3Pool_CAT_ETH", address: poolAddr });
  fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
}

main().catch((err) => {
  console.error("POOL CREATION FAILED:", err.message);
  process.exit(1);
});
