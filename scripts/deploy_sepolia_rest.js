// deploy_sepolia_rest.js — Deploy remaining contracts + GNC/CTV + Anchor (Sepolia)
const { ethers } = require("hardhat");

async function deploy(name, ...args) {
  const factory = await ethers.getContractFactory(name);
  const contract = args.length > 0
    ? await factory.deploy(...args)
    : await factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`  [OK] ${name}: ${addr}`);
  return { name, address: addr, contract };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const ADDR = deployer.address;
  console.log(`Deployer: ${ADDR}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(ADDR))} ETH\n`);

  const deployed = [];

  console.log("── 8. Bridge (ya deployado) ──");
  console.log("  [SKIP] BridgeVault: 0xB1a03Cd954B7473c3bd3830DaDdFA110f6342943");

  console.log("\n── 9. Vesting ──");
  try { deployed.push(await deploy("TokenVesting")); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }

  console.log("\n── 10. Operations ──");
  try { deployed.push(await deploy("OperationsRegistry")); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }
  try { deployed.push(await deploy("AuditManager", ADDR)); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }

  console.log("\n── 11. Registries ──");
  try { deployed.push(await deploy("EventRegistry")); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }
  try { deployed.push(await deploy("PolicyRegistry")); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }
  try { deployed.push(await deploy("RiskPolicyRegistry")); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }
  try { deployed.push(await deploy("TraceRegistry")); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }

  console.log("\n── 12. FLT Vesting ──");
  try { deployed.push(await deploy("TokenVesting")); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }

  // GNC + CTV — use the CatalystToken address from Sepolia deploy
  const catAddr = "0xD0BDAdf8618D487458e2AD3b6d6B1CfD884e7D72";
  console.log("\n── 13. GNC + CTV (Banking Core) ──");
  try { deployed.push(await deploy("GananciaToken", catAddr)); } catch(e) { console.log(`  [SKIP] GananciaToken: ${e.message.slice(0,80)}`); }
  try { deployed.push(await deploy("TokenCautivo", ADDR)); } catch(e) { console.log(`  [SKIP] TokenCautivo: ${e.message.slice(0,80)}`); }

  console.log("\n── 14. Accounting Anchor ──");
  try { deployed.push(await deploy("AccountingAnchor", ADDR)); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }

  console.log(`\n========================================`);
  console.log(`  ${deployed.length} contratos adicionales desplegados en Sepolia`);
  console.log(`========================================`);
  for (const d of deployed) {
    console.log(`  ${d.name}: ${d.address}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
