// =============================================================================
// deploy_distribution.js — Token distribution per TOKENOMICS.md
// =============================================================================
// Run AFTER deploy_core.js:
//   npx hardhat run scripts/deploy_distribution.js --network sepolia
// =============================================================================

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const ONE_CAT = ethers.parseEther("1");
const ONE_MILLION = ONE_CAT * 1_000_000n;

// ── Tokenomics allocation ──
const ALLOCATIONS = [
  {
    name: "Platform Treasury",
    amount: 300n * ONE_MILLION,   // 300M CAT → 30%
    startOffset: 0,                 // starts now
    cliffSeconds: 0,                // no cliff
    vestingSeconds: 4 * 365 * 86400, // 4 years
    revocable: false,
  },
  {
    name: "Community & Ecosystem",
    amount: 250n * ONE_MILLION,   // 250M CAT → 25%
    startOffset: 0,
    cliffSeconds: 0,
    vestingSeconds: 3 * 365 * 86400, // 3 years
    revocable: false,
  },
  {
    name: "Team & Advisors",
    amount: 150n * ONE_MILLION,   // 150M CAT → 15%
    startOffset: 0,
    cliffSeconds: 365 * 86400,      // 1 year cliff
    vestingSeconds: 3 * 365 * 86400, // 3 year linear (total 4yr)
    revocable: true,
  },
  {
    name: "Private Sale",
    amount: 150n * ONE_MILLION,   // 150M CAT → 15%
    startOffset: 0,
    cliffSeconds: 0,
    vestingSeconds: 365 * 86400,    // 1 year
    revocable: false,
  },
  {
    name: "Airdrop",
    amount: 50n * ONE_MILLION,    // 50M CAT → 5%
    startOffset: 0,
    cliffSeconds: 0,
    vestingSeconds: 180 * 86400,    // 6 months (~180 days)
    revocable: false,
  },
];

const LIQUIDITY_ALLOCATION = 100n * ONE_MILLION; // 100M CAT → 10% (unlocked, for DEX)
const TOTAL_DISTRIBUTED = 950n * ONE_MILLION;    // 950M (all except liquidity)
const TOTAL_CAT = ethers.parseEther("1000000000"); // 1B

async function main() {
  const [deployer] = await ethers.getSigners();
  const ADDR = deployer.address;
  console.log(`\n  Distributor: ${ADDR}`);
  console.log(`  Balance:     ${ethers.formatEther(await ethers.provider.getBalance(ADDR))} ETH\n`);

  // ── Load deployed addresses ──
  const contractsPath = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts.json");
  let contracts;
  try {
    contracts = JSON.parse(fs.readFileSync(contractsPath, "utf-8"));
  } catch {
    console.error("  ✗ contracts.json not found. Run deploy_core.js first.");
    process.exit(1);
  }
  const getAddr = (name) => contracts.find((c) => c.name === name)?.address;

  const catAddr = getAddr("CatalystToken");
  if (!catAddr) { console.error("  ✗ CatalystToken not found in contracts.json"); process.exit(1); }

  const cat = await ethers.getContractAt("CatalystToken", catAddr);
  const deployerBalance = await cat.balanceOf(ADDR);
  console.log(`  CAT deployer balance: ${ethers.formatEther(deployerBalance)} CAT\n`);

  // ── Deploy TokenVesting ──
  console.log("── Deploying TokenVesting ──");
  const Vesting = await ethers.getContractFactory("TokenVesting");
  const vesting = await Vesting.deploy(catAddr);
  await vesting.waitForDeployment();
  const vestingAddr = await vesting.getAddress();
  console.log(`  ✓ TokenVesting: ${vestingAddr}`);

  // ── Transfer CAT to vesting contract ──
  const vestingTotal = TOTAL_DISTRIBUTED + LIQUIDITY_ALLOCATION;
  console.log(`\n── Transferring ${ethers.formatEther(vestingTotal)} CAT to vesting contract ──`);
  const tx = await cat.transfer(vestingAddr, vestingTotal);
  await tx.wait();
  console.log(`  ✓ Transferred. Vesting balance: ${ethers.formatEther(await cat.balanceOf(vestingAddr))} CAT`);

  // ── Create vesting schedules ──
  console.log("\n── Creating Vesting Schedules ──");
  const now = Math.floor(Date.now() / 1000);

  // We use batchCreateSchedules per allocation group.
  // Each group gets a single treasury-controlled beneficiary address
  // (governance multisig or treasury address — for now, deployer)
  for (const alloc of ALLOCATIONS) {
    const startTime = now + alloc.startOffset;
    await vesting.createSchedule(
      ADDR, // beneficiary = treasury multisig in production
      alloc.amount,
      startTime,
      alloc.cliffSeconds,
      alloc.vestingSeconds,
      alloc.revocable
    );
    const endDate = new Date((startTime + alloc.cliffSeconds + alloc.vestingSeconds) * 1000);
    console.log(
      `  ✓ ${alloc.name.padEnd(25)} ${ethers.formatEther(alloc.amount).padStart(8)} CAT` +
      ` | cliff: ${(alloc.cliffSeconds / 86400).toFixed(0)}d` +
      ` | vest: ${(alloc.vestingSeconds / 86400).toFixed(0)}d` +
      ` | ends: ${endDate.toISOString().slice(0, 10)}`
    );
  }

  // ── Send liquidity allocation back to deployer for DEX setup ──
  console.log(`\n── Liquidity Allocation: ${ethers.formatEther(LIQUIDITY_ALLOCATION)} CAT ──`);
  // Create a dummy schedule with 0 vesting so it can be claimed immediately
  await vesting.createSchedule(
    ADDR,                       // beneficiary
    LIQUIDITY_ALLOCATION,       // 100M CAT
    now,                        // start now
    0,                          // no cliff
    0,                          // instant vesting
    false
  );
  // Claim it immediately
  await vesting.claim(ADDR);
  console.log(`  ✓ ${ethers.formatEther(LIQUIDITY_ALLOCATION)} CAT available for DEX liquidity`);

  // ── Final Balances ──
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  DISTRIBUTION COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Deployer:         ${ethers.formatEther(await cat.balanceOf(ADDR))} CAT`);
  console.log(`  Vesting Contract: ${ethers.formatEther(await cat.balanceOf(vestingAddr))} CAT (${(await vesting.beneficiaryCount()).toString()} schedules)`);
  console.log(`  CAT Total Supply: ${ethers.formatEther(await cat.totalSupply())} CAT`);

  // ── Save vesting address ──
  contracts.push({ name: "TokenVesting", address: vestingAddr });
  fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
  console.log(`\n  TokenVesting saved to contracts.json\n`);
}

main().catch((err) => {
  console.error("DISTRIBUTION FAILED:", err.message);
  process.exit(1);
});
