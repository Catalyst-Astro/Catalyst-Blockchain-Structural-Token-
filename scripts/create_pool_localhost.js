// create_pool_localhost.js — CAT/ETH Liquidity Pool at Oracle Price
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const contracts = require("../apps/catalyst-studio/src/contracts.json");
  const catAddr = contracts.find(c => c.name === "CatalystToken").address;
  const oracleAddr = contracts.find(c => c.name === "MXNPriceOracle").address;

  console.log("=".repeat(60));
  console.log("  CATALYST BANK — LIQUIDITY POOL CREATION");
  console.log("=".repeat(60));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`ETH:      ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))}`);
  console.log(`CAT:      ${catAddr}`);
  console.log(`Oracle:   ${oracleAddr}`);

  // ── Oracle Rates ──
  const oracle = await ethers.getContractAt("MXNPriceOracle", oracleAddr);
  const catUsd = await oracle.getCatUsdRate();
  const catMxn = await oracle.getCatMxnRate();
  console.log(`\nOracle: 1 CAT = $${ethers.formatUnits(catUsd, 18)} USD | $${ethers.formatUnits(catMxn, 18)} MXN`);

  // ── CAT Balance ──
  const cat = await ethers.getContractAt("CatalystToken", catAddr);
  const bal = await cat.balanceOf(deployer.address);
  console.log(`CAT bal:  ${ethers.formatEther(bal)} CAT`);

  // ── Deploy Pool Contract ──
  const PoolFactory = await ethers.getContractFactory("Treasury");
  const pool = await PoolFactory.deploy(deployer.address);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log(`\nPool:     ${poolAddr}`);

  // ── Add Liquidity: 1,000,000 CAT + 50 ETH ──
  // Price: 1 CAT = 0.00005 ETH ($0.10 / $2000)
  const catAmt = ethers.parseEther("1000000");  // 1M CAT
  const ethAmt = ethers.parseEther("50");        // 50 ETH (1M * 0.00005)

  console.log(`\nAdding liquidity:`);
  console.log(`  CAT:     ${ethers.formatEther(catAmt)} CAT`);
  console.log(`  ETH:     ${ethers.formatEther(ethAmt)} ETH`);
  console.log(`  Price:   1 CAT = ${(50/1000000).toFixed(8)} ETH`);
  console.log(`  Value:   $${(1000000 * 0.10).toLocaleString()} USD`);

  // Transfer CAT to pool
  const tx1 = await cat.transfer(poolAddr, catAmt);
  await tx1.wait();
  console.log(`\n[OK] CAT transferred: ${tx1.hash}`);

  // Transfer ETH to pool
  const tx2 = await deployer.sendTransaction({ to: poolAddr, value: ethAmt });
  await tx2.wait();
  console.log(`[OK] ETH transferred: ${tx2.hash}`);

  // ── Verify ──
  const poolCAT = await cat.balanceOf(poolAddr);
  const poolETH = await ethers.provider.getBalance(poolAddr);
  console.log(`\n========================================`);
  console.log(`  POOL ACTIVO — LIQUIDEZ REAL`);
  console.log(`========================================`);
  console.log(`  Contrato:    ${poolAddr}`);
  console.log(`  CAT en pool: ${ethers.formatEther(poolCAT)} CAT`);
  console.log(`  ETH en pool: ${ethers.formatEther(poolETH)} ETH`);
  console.log(`  Precio:      1 CAT = 0.00005 ETH`);
  console.log(`  Valor USD:   $${(parseFloat(ethers.formatEther(poolCAT)) * 0.10).toLocaleString()}`);
  console.log(`  Valor MXN:   $${(parseFloat(ethers.formatEther(poolCAT)) * 2.0).toLocaleString()}`);
  console.log(`  Fee:         0.3% para el banco`);
  console.log(`========================================`);

  // Save pool address
  contracts.push({ name: "CAT_ETH_Pool", address: poolAddr });
  const cp = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts.json");
  fs.writeFileSync(cp, JSON.stringify(contracts, null, 2));
  console.log(`\n[OK] Pool saved to contracts.json (${contracts.length} contracts)`);

  // ── How to use ──
  console.log(`\nTo swap: send ETH to pool and receive CAT, or send CAT to receive ETH`);
  console.log(`1 ETH = 20,000 CAT  |  1 CAT = 0.00005 ETH`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
