// deploy_sepolia_all.js — ONE-CLICK Sepolia Deploy (30 contratos)
// Prerequisito: Tener >0.02 ETH en Sepolia en la wallet del .env
// Uso: npx hardhat run scripts/deploy_sepolia_all.js --network sepolia
// =============================================================================

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function deploy(name, ...args) {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`  [OK] ${name}: ${addr}`);
  return { name, address: addr, contract };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const ADDR = deployer.address;
  const ZERO = "0x0000000000000000000000000000000000000000";

  const bal = await ethers.provider.getBalance(ADDR);
  console.log(`\n  Deployer: ${ADDR}`);
  console.log(`  Balance:  ${ethers.formatEther(bal)} ETH`);
  console.log(`  Network:  ${hre.network.name} (chainId: ${(await ethers.provider.getNetwork()).chainId})\n`);

  if (bal < ethers.parseEther("0.015")) {
    console.error("  [ERROR] Insufficient ETH. Need >0.015 ETH for gas.");
    console.error("  Get Sepolia ETH: https://sepoliafaucet.com");
    console.error(`  Send to: ${ADDR}`);
    process.exit(1);
  }

  const deployed = [];

  // ── 1. Infraestructura ──
  console.log("── 1. Infraestructura Base ──");
  deployed.push(await deploy("RoleAuthority"));
  deployed.push(await deploy("EmergencyMode"));

  // ── 2. Tokens ──
  console.log("\n── 2. Tokens ──");
  deployed.push(await deploy("CatalystToken", ADDR));
  deployed.push(await deploy("InflationaryRewardToken", ADDR));
  deployed.push(await deploy("FractalToken", ADDR));
  deployed.push(await deploy("AIMToken", ADDR));

  // ── 3. Identity ──
  console.log("\n── 3. Identity ──");
  deployed.push(await deploy("CatalystIdentitySBT"));
  deployed.push(await deploy("IdentityRegistry"));

  // ── 4. Compliance ──
  console.log("\n── 4. Compliance ──");
  deployed.push(await deploy("WhitelistRegistry"));
  deployed.push(await deploy("ComplianceDAO", ADDR));
  deployed.push(await deploy("FreezeRegistry"));

  // ── 5. Governance ──
  console.log("\n── 5. Governance ──");
  deployed.push(await deploy("GovernanceDAO", ADDR));
  deployed.push(await deploy("FractalDAO", ADDR));
  deployed.push(await deploy("MultisigCouncil", [ADDR], 1));

  // ── 6. Treasury ──
  console.log("\n── 6. Treasury & Finance ──");
  deployed.push(await deploy("Treasury", ADDR));
  deployed.push(await deploy("SettlementLog"));

  // ── 7. Oracle ──
  console.log("\n── 7. Oracle & Pricing ──");
  deployed.push(await deploy("MXNPriceOracle"));
  deployed.push(await deploy("ServicePricing", ADDR));
  deployed.push(await deploy("AIServiceMeter", ADDR));

  // ── 8. Bridge ──
  console.log("\n── 8. Bridge ──");
  deployed.push(await deploy("BridgeVault", ADDR));

  // ── 9. Vesting ──
  console.log("\n── 9. Vesting ──");
  deployed.push(await deploy("TokenVesting"));

  // ── 10. Operations ──
  console.log("\n── 10. Operations ──");
  deployed.push(await deploy("OperationsRegistry"));
  deployed.push(await deploy("AuditManager", ADDR));

  // ── 11. Registries ──
  console.log("\n── 11. Registries ──");
  deployed.push(await deploy("EventRegistry"));
  deployed.push(await deploy("PolicyRegistry"));
  deployed.push(await deploy("RiskPolicyRegistry"));

  // ── 12. GNC + CTV ──
  console.log("\n── 12. GNC + CTV (Banking) ──");
  const catAddr = deployed.find(d => d.name === "CatalystToken").address;
  const treasuryAddr = deployed.find(d => d.name === "Treasury").address;
  deployed.push(await deploy("GananciaToken", catAddr));
  deployed.push(await deploy("TokenCautivo", ADDR));

  // ── 13. Accounting Anchor ──
  console.log("\n── 13. Accounting Anchor ──");
  deployed.push(await deploy("AccountingAnchor", ADDR));

  // ── Save ──
  const contractsPath = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts_sepolia.json");
  const clean = deployed.map(d => ({ name: d.name, address: d.address }));
  fs.writeFileSync(contractsPath, JSON.stringify(clean, null, 2));

  console.log(`\n========================================`);
  console.log(`  SEPOLIA DEPLOY COMPLETADO`);
  console.log(`  ${deployed.length} contratos`);
  console.log(`  Guardado: contracts_sepolia.json`);
  console.log(`========================================`);

  // Print addresses
  console.log(`\n  Direcciones clave:`);
  for (const d of deployed) {
    if (["CatalystToken","Treasury","MXNPriceOracle","GananciaToken","TokenCautivo","AccountingAnchor","SettlementLog"].includes(d.name)) {
      console.log(`    ${d.name}: ${d.address}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
