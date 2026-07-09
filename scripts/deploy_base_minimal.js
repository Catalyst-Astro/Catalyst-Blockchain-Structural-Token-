// deploy_base_minimal.js — DEPLOY MÍNIMO A BASE MAINNET (4 contratos)
// Estrategia: solo lo esencial para CAT → Uniswap → ETH → Bitso → MXN → SPEI → BBVA
// Gas estimado: ~$3-5 USD (Base L2)
// Uso: npx hardhat run scripts/deploy_base_minimal.js --network base
// =============================================================================

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function deploy(name, ...args) {
  const factory = await ethers.getContractFactory(name);
  console.log(`  Deploying ${name}...`);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`  ✅ ${name}: ${addr}`);
  return { name, address: addr, contract };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const ADDR = deployer.address;

  const bal = await ethers.provider.getBalance(ADDR);
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  🚀 CATALYST BASE MAINNET — DEPLOY MÍNIMO`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`  Deployer: ${ADDR}`);
  console.log(`  Balance:  ${ethers.formatEther(bal)} ETH`);
  console.log(`  Network:  ${hre.network.name} (chainId: ${(await ethers.provider.getNetwork()).chainId})`);
  console.log(`  Estrategia: 4 contratos → ~$3-5 USD gas\n`);

  if (bal < ethers.parseEther("0.002")) {
    console.error("  ❌ Insufficient ETH. Need >0.002 ETH for gas on Base.");
    console.error("  Bridge ETH to Base: https://bridge.base.org");
    console.error(`  Send to: ${ADDR}`);
    process.exit(1);
  }

  const deployed = [];

  // ── 1. CATALYST TOKEN (ERC-20 + Burn) ──
  console.log("── 1. CATALYST TOKEN ──");
  const catSupply = ethers.parseEther("1000000000"); // 1B CAT
  deployed.push(await deploy("CatalystToken", "Catalyst Token", "CAT", catSupply, 250));
  const catAddr = deployed[deployed.length - 1].address;

  // ── 2. MXN PRICE ORACLE ──
  console.log("\n── 2. MXN PRICE ORACLE ──");
  // 1 CAT = $0.10 USD = $2.00 MXN (initial peg)
  const catUsd = ethers.parseEther("0.10");   // 10 cents USD
  const usdMxn = ethers.parseEther("20.00");   // 20 MXN per USD
  deployed.push(await deploy("MXNPriceOracle", ADDR, catUsd, usdMxn));

  // ── 3. TREASURY ──
  console.log("\n── 3. TREASURY ──");
  deployed.push(await deploy("Treasury", ADDR));
  const treasuryAddr = deployed[deployed.length - 1].address;

  // ── 4. SETTLEMENT LOG ──
  console.log("\n── 4. SETTLEMENT LOG ──");
  deployed.push(await deploy("SettlementLog", ADDR));

  // ── Transfer CAT to Treasury for operations ──
  console.log("\n── 5. FUNDING TREASURY ──");
  const catContract = deployed.find(d => d.name === "CatalystToken").contract;
  const treasuryAmount = ethers.parseEther("100000000"); // 100M CAT (10%)
  const tx = await catContract.transfer(treasuryAddr, treasuryAmount);
  await tx.wait();
  console.log(`  ✅ Treasury funded: ${ethers.formatEther(treasuryAmount)} CAT → ${treasuryAddr}`);
  console.log(`  TX: ${tx.hash}`);

  // ── Verify final supply ──
  const deployerBalance = await catContract.balanceOf(ADDR);
  const treasuryBalance = await catContract.balanceOf(treasuryAddr);
  console.log(`\n  📊 Balances finales:`);
  console.log(`     Deployer: ${ethers.formatEther(deployerBalance)} CAT`);
  console.log(`     Treasury: ${ethers.formatEther(treasuryBalance)} CAT`);

  // ── Save addresses ──
  const contractsPath = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts_base.json");
  const clean = deployed.map(d => ({ name: d.name, address: d.address }));
  fs.writeFileSync(contractsPath, JSON.stringify(clean, null, 2));

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  ✅ BASE MAINNET DEPLOY COMPLETADO`);
  console.log(`  ${deployed.length} contratos + treasury funding`);
  console.log(`  Guardado: contracts_base.json`);
  console.log(`═══════════════════════════════════════════════`);

  console.log(`\n  Direcciones:`);
  for (const d of deployed) {
    console.log(`    ${d.name}: ${d.address}`);
  }
  console.log(`\n  Próximos pasos:`);
  console.log(`    1. Verificar en https://basescan.org`);
  console.log(`    2. Crear pool Uniswap V3 CAT/ETH`);
  console.log(`    3. Arrancar servidor con BITSO_SANDBOX=false`);
  console.log(`    4. POST /api/cobrar → ¡dinero real a BBVA!`);
  console.log(`\n  Gas total estimado: ~$3-5 USD`);
  console.log(`  (vs ~$50 desplegando 29 contratos)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
