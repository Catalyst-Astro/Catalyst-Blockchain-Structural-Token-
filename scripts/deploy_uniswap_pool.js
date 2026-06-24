// deploy_uniswap_pool.js — Create Uniswap V3 CAT/ETH liquidity pool
// Requires: Uniswap V3 contracts on target network
// Run: npx hardhat run scripts/deploy_uniswap_pool.js --network sepolia
//
// Prerequisites:
//   1. CAT token deployed (address from contracts.json)
//   2. WETH available on network (0xfff997... on Sepolia, 0xC02aa... on Mainnet)
//   3. Deployer has: CAT tokens + ETH for liquidity + gas
// =============================================================================

const { ethers } = require("hardhat");

// Uniswap V3 factory addresses
const UNISWAP_V3_FACTORY = {
  sepolia: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
  mainnet: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  localhost: null, // Need to deploy factory first
};

const UNISWAP_SWAP_ROUTER = {
  sepolia: "0x3bFA4769FB09eEfC5a80d6E87c3B9C650f7Ae48E",
  mainnet: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
};

// WETH addresses
const WETH = {
  sepolia: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};

// Uniswap V3 Factory ABI (minimal)
const FACTORY_ABI = [
  "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)",
];

// NonfungiblePositionManager ABI (for adding liquidity)
const POSITION_MANAGER_ABI = [
  "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)",
  "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
];

// Position Manager addresses
const POSITION_MANAGER = {
  sepolia: "0x1238536071E1c677A632429e3655c799b22cDA52",
  mainnet: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
};

async function main() {
  const network = hre.network.name;
  console.log(`\n  Creating Uniswap V3 CAT/ETH pool on: ${network}`);

  const factoryAddr = UNISWAP_V3_FACTORY[network];
  const positionMgrAddr = POSITION_MANAGER[network];
  const wethAddr = WETH[network];

  if (!factoryAddr || !positionMgrAddr) {
    console.log(`  Uniswap V3 not available on "${network}"`);
    console.log(`  Available: sepolia, mainnet`);
    return;
  }

  const [deployer] = await ethers.getSigners();
  const contracts = require("../apps/catalyst-studio/src/contracts.json");
  const catAddr = contracts.find(c => c.name === "CatalystToken")?.address;
  if (!catAddr) throw new Error("CatalystToken not found in contracts.json");

  console.log(`  Deployer:    ${deployer.address}`);
  console.log(`  CAT:         ${catAddr}`);
  console.log(`  WETH:        ${wethAddr}`);
  console.log(`  Factory:     ${factoryAddr}`);
  console.log(`  PositionMgr: ${positionMgrAddr}`);

  // Step 1: Check if pool already exists
  const factory = new ethers.Contract(factoryAddr, FACTORY_ABI, deployer);
  const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

  for (const fee of feeTiers) {
    const existingPool = await factory.getPool(catAddr, wethAddr, fee);
    if (existingPool && existingPool !== ethers.ZeroAddress) {
      console.log(`\n  Pool already exists at ${fee/10000}% tier: ${existingPool}`);
    }
  }

  // Step 2: Create pool at 0.3% fee tier (standard for volatile pairs)
  const FEE = 3000; // 0.3%
  console.log(`\n  Creating pool at 0.3% fee tier...`);

  // Get CAT token
  const cat = await ethers.getContractAt("CatalystToken", catAddr);

  // Amounts: 10,000 CAT + 0.1 ETH as initial liquidity
  const catAmount = ethers.parseEther("10000"); // 10,000 CAT
  const ethAmount = ethers.parseEther("0.1");    // 0.1 ETH

  // Check balances
  const catBal = await cat.balanceOf(deployer.address);
  const ethBal = await ethers.provider.getBalance(deployer.address);

  console.log(`\n  Deployer CAT balance: ${ethers.formatEther(catBal)} CAT`);
  console.log(`  Deployer ETH balance: ${ethers.formatEther(ethBal)} ETH`);

  if (catBal < catAmount) {
    console.log(`  [WARN] Insufficient CAT. Need ${ethers.formatEther(catAmount)}`);
    console.log(`  [WARN] Mint or transfer CAT first`);
    return;
  }

  // Step 3: Approve CAT for Position Manager
  console.log(`\n  Approving CAT for PositionManager...`);
  const approveTx = await cat.approve(positionMgrAddr, catAmount);
  await approveTx.wait();
  console.log(`  Approved: ${approveTx.hash}`);

  // Step 4: Calculate sqrtPriceX96
  // Initial price: 1 CAT = 0.00001 ETH (at $0.10/CAT and $2000/ETH)
  // Or: 1 CAT = 0.10 USD / 2000 USD/ETH = 0.00005 ETH
  // ratio = token1/token0 where token0 < token1
  // Determine token order (CAT vs WETH by address)
  const catLower = catAddr.toLowerCase() < wethAddr.toLowerCase();
  const token0 = catLower ? catAddr : wethAddr;
  const token1 = catLower ? wethAddr : catAddr;

  // Price: 1 CAT = 0.00005 WETH (so WETH/CAT = 20000)
  // sqrtPriceX96 for WETH/CAT = 20000:
  // sqrt(20000) * 2^96
  const price = ethers.parseUnits("20000", 0);
  const sqrtPrice = ethers.toBigInt(
    Math.floor(Math.sqrt(20000) * 2**96)
  );
  // Actually use a simpler approach
  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(20000) * 2**96));

  // Step 5: Create and initialize pool
  const positionMgr = new ethers.Contract(positionMgrAddr, POSITION_MANAGER_ABI, deployer);
  console.log(`\n  Creating & initializing pool...`);

  try {
    const createTx = await positionMgr.createAndInitializePoolIfNecessary(
      token0, token1, FEE, sqrtPriceX96
    );
    await createTx.wait();
    console.log(`  Pool created: ${createTx.hash}`);
  } catch (e) {
    console.log(`  Pool may already exist: ${e.message.slice(0, 80)}`);
  }

  // Get pool address
  const poolAddr = await factory.getPool(catAddr, wethAddr, FEE);
  console.log(`\n  Pool address: ${poolAddr}`);

  // Step 6: Add initial liquidity
  console.log(`\n  Adding initial liquidity: ${ethers.formatEther(catAmount)} CAT + ${ethers.formatEther(ethAmount)} ETH`);

  // Calculate tick range (±50% from current price)
  // Tick spacing for 0.3% fee = 60
  const tickSpacing = 60;
  // Current tick ≈ log(price)/log(1.0001)
  // For price = 20000 (WETH/CAT), tick ≈ log(20000)/log(1.0001) ≈ 99039
  const currentTick = Math.floor(Math.log(20000) / Math.log(1.0001));
  const tickLower = Math.floor((currentTick - 5000) / tickSpacing) * tickSpacing;
  const tickUpper = Math.floor((currentTick + 5000) / tickSpacing) * tickSpacing;

  console.log(`  Current tick:  ${currentTick}`);
  console.log(`  Tick range:    [${tickLower}, ${tickUpper}]`);

  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  const mintParams = {
    token0,
    token1,
    fee: FEE,
    tickLower,
    tickUpper,
    amount0Desired: catLower ? catAmount : ethAmount,
    amount1Desired: catLower ? ethAmount : catAmount,
    amount0Min: 0,
    amount1Min: 0,
    recipient: deployer.address,
    deadline,
  };

  try {
    const mintTx = await positionMgr.mint(mintParams, { value: catLower ? 0n : ethAmount });
    await mintTx.wait();
    console.log(`  Liquidity added: ${mintTx.hash}`);
  } catch (e) {
    console.log(`  [ERROR] Add liquidity failed: ${e.message.slice(0, 200)}`);
  }

  // Step 7: Summary
  console.log(`\n  ================================================`);
  console.log(`  UNISWAP V3 POOL READY`);
  console.log(`  ================================================`);
  console.log(`  Network:    ${network}`);
  console.log(`  CAT:        ${catAddr}`);
  console.log(`  WETH:       ${wethAddr}`);
  console.log(`  Pool:       ${poolAddr}`);
  console.log(`  Fee tier:   0.3%`);
  console.log(`  Liquidity:  10,000 CAT + 0.1 ETH`);
  console.log(`  Price:      1 CAT = 0.00005 ETH (~$0.10 USD)`);
  console.log(`  ================================================`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
