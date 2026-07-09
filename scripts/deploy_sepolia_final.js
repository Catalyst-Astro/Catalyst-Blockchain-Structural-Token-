// deploy_sepolia_final.js — Deploy critical banking + remaining contracts to Sepolia
// Uses exact constructor args from deploy_core.js and deploy_gnc_ctv.js
const { ethers } = require("hardhat");
const crypto = require("crypto");
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
  console.log(`Deployer: ${ADDR}`);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  // Contract addresses from earlier Sepolia deploy
  const catAddr = "0xD0BDAdf8618D487458e2AD3b6d6B1CfD884e7D72";
  const treasuryAddr = "0x7e799Fb9440236F273eC158221D28b798430311E";

  // ── 1. TokenVesting (needed for tokenomics) ──
  console.log("── 1. TokenVesting ──");
  let vestingAddr;
  try {
    const v = await deploy("TokenVesting", catAddr);
    vestingAddr = v.address;
  } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }

  // ── 2. Operations ──
  console.log("\n── 2. Operations ──");
  try { await deploy("OperationsRegistry", ADDR); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }
  try { await deploy("AuditManager"); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }

  // ── 3. Registries ──
  console.log("\n── 3. Registries ──");
  try { await deploy("EventRegistry", ADDR, 1, 1); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }
  try { await deploy("PolicyRegistry", ADDR); } catch(e) { console.log(`  [SKIP] ${e.message.slice(0,80)}`); }
  try { await deploy("RiskPolicyRegistry", ADDR); } catch(e) {
    try { await deploy("RiskPolicyRegistry", ADDR, ZERO); } catch(e2) { console.log(`  [SKIP] ${e2.message.slice(0,80)}`); }
  }

  // ── 4. GNC + CTV — THE BANKING CORE ──
  console.log("\n── 4. Banco: GNC + CTV ──");
  const genesisProof = ethers.keccak256(
    ethers.toUtf8Bytes("CATALYST-GENESIS-SEPOLIA-2026-06-23")
  );

  let gncAddr;
  try {
    const gnc = await deploy(
      "GananciaToken", ADDR, treasuryAddr, genesisProof, 0, 0
    );
    gncAddr = gnc.address;
    console.log(`  GNC: 1:1 CNY peg, 18T max supply`);
  } catch(e) { console.log(`  [SKIP] GNC: ${e.message.slice(0,80)}`); }

  let ctvAddr;
  if (gncAddr) {
    try {
      const ctv = await deploy(
        "TokenCautivo", ADDR, ADDR, gncAddr, "BCRMXMMPYM", "012290015202390246"
      );
      ctvAddr = ctv.address;
      console.log(`  CTV: SWIFT BIC BCRMXMMPYM, CLABE 012290015202390246`);

      // Link GNC ↔ CTV
      const gncContract = await ethers.getContractAt("GananciaToken", gncAddr);
      const linkTx = await gncContract.vincularCautivo(ctvAddr, ethers.parseEther("1000"));
      await linkTx.wait();
      console.log(`  Bridge: 1 CTV = 1,000 GNC`);
    } catch(e) { console.log(`  [SKIP] CTV: ${e.message.slice(0,80)}`); }
  }

  // ── 5. Final balance ──
  const finalBal = await ethers.provider.getBalance(ADDR);
  console.log(`\n========================================`);
  console.log(`  SEPOLIA DEPLOY COMPLETADO`);
  console.log(`  Balance final: ${ethers.formatEther(finalBal)} ETH`);
  console.log(`========================================`);
  console.log(`\n  Direcciones Clave Sepolia:`);
  console.log(`  CatalystToken:     ${catAddr}`);
  console.log(`  Treasury:          ${treasuryAddr}`);
  console.log(`  MXNPriceOracle:    0xF58501ef9C3f26aD89cA53D62Af50c5e0403a9BC`);
  console.log(`  SettlementLog:     0xC4f9cca27ED1A6339C1f6d6eaA3aeB51F259ccC0`);
  console.log(`  AccountingAnchor:  0x8632FD83eB55BDcC36786d79084Ed51dD67D8F77`);
  if (gncAddr) console.log(`  GananciaToken:     ${gncAddr}`);
  if (ctvAddr) console.log(`  TokenCautivo:      ${ctvAddr}`);
  if (vestingAddr) console.log(`  TokenVesting:      ${vestingAddr}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
