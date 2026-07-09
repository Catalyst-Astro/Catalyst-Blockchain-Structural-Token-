// =============================================================================
// deploy_gnc_ctv.js — Despliegue de GananciaToken (GNC) + TokenCautivo (CTV)
// =============================================================================
// npx hardhat run scripts/deploy_gnc_ctv.js --network localhost
// =============================================================================

const { ethers } = require("hardhat");
const crypto = require("crypto");

async function deploy(name, ...args) {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  return { name, address: addr, contract };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const ADDR = deployer.address;

  console.log(`\n  Deployer: ${ADDR}`);
  console.log(`  Balance:  ${ethers.formatEther(await ethers.provider.getBalance(ADDR))} ETH\n`);

  // Load existing contracts
  const contracts = require("../apps/catalyst-studio/src/contracts.json");
  function getAddr(name) {
    const c = contracts.find((c) => c.name === name);
    if (!c) throw new Error(`Contract ${name} not found in contracts.json`);
    return c.address;
  }

  const treasuryAddr = getAddr("Treasury");
  const catAddr = getAddr("CatalystToken");
  console.log(`  Treasury: ${treasuryAddr}`);
  console.log(`  CAT:      ${catAddr}\n`);

  // ── Initial backing proof hash (genesis, will be updated after QR triggers) ──
  const genesisProof = ethers.keccak256(
    ethers.toUtf8Bytes("CATALYST-GENESIS-2026-06-22-BELL-13450.50")
  );

  // ── 1. Deploy GananciaToken (GNC) ──
  console.log("── 1. GananciaToken (GNC) ──");
  const gnc = await deploy(
    "GananciaToken",
    ADDR,            // swiftIssuer_ = deployer (BCRMXMMPYM representative)
    treasuryAddr,    // treasury_ = Treasury contract
    genesisProof,    // backingProofHash_
    0,               // totalCnyBacked_ = 0 (will fill with real QR triggers)
    0                // totalCatBurned_ = 0 (will fill with real burns)
  );
  console.log(`  ✓ GNC: ${gnc.address}`);
  console.log(`  ✓ MAX_SUPPLY: 18,000,000,000,000 GNC (18T)`);
  console.log(`  ✓ 1 GNC = 1 CNY (1:1 peg)`);

  // ── 2. Deploy TokenCautivo (CTV) ──
  console.log("\n── 2. TokenCautivo (CTV) ──");
  const ctv = await deploy(
    "TokenCautivo",
    ADDR,                            // admin_
    ADDR,                            // swiftIssuer_ (BCRMXMMPYM)
    gnc.address,                     // gananciaBridge_ = GNC contract
    "BCRMXMMPYM",                    // swiftBic_
    "012290015202390246"             // clabe_
  );
  console.log(`  ✓ CTV: ${ctv.address}`);
  console.log(`  ✓ MAX_SUPPLY: 18,000,000,000 CTV (18B)`);
  console.log(`  ✓ SWIFT BIC: BCRMXMMPYM`);
  console.log(`  ✓ CLABE:     012290015202390246`);
  console.log(`  ✓ Libre usanza activada para deployer (100k CTV/día)`);

  // ── 3. Link GNC ↔ CTV ──
  console.log("\n── 3. Vinculando GNC ↔ CTV ──");

  // Link CTV from GNC side
  const gncRate = ethers.parseEther("1000"); // 1 CTV = 1,000 GNC
  const tx1 = await gnc.contract.vincularCautivo(ctv.address, gncRate);
  await tx1.wait();
  console.log(`  ✓ GNC.cautivo → ${ctv.address} (rate: 1 CTV = 1,000 GNC)`);

  // Grant SWIFT_ISSUER role to CTV on GNC (for future fiat conversion bridge)
  const SWIFT_ISSUER = ethers.keccak256(ethers.toUtf8Bytes("SWIFT_ISSUER"));
  await gnc.contract.grantRole(SWIFT_ISSUER, ctv.address);
  console.log(`  ✓ CTV granted SWIFT_ISSUER on GNC`);

  // ── 4. Verify ──
  console.log("\n── 4. Verificación On-Chain ──");
  console.log(`  GNC Supply:       ${ethers.formatEther(await gnc.contract.totalSupply())} GNC`);
  console.log(`  GNC Backing:      ${ethers.formatEther(await gnc.contract.totalCnyBacked())} CNY`);
  console.log(`  GNC Backing Ratio: ${ethers.formatEther(await gnc.contract.getBackingRatio())}`);
  console.log(`  GNC Cautivo Link:  ${await gnc.contract.tokenCautivo()}`);
  console.log(`  CTV Supply:       ${ethers.formatEther(await ctv.contract.totalSupply())} CTV`);
  console.log(`  CTV SWIFT BIC:    ${await ctv.contract.swiftBic()}`);
  console.log(`  CTV CLABE:        ${await ctv.contract.clabePrincipal()}`);

  const swiftInfo = await ctv.contract.getSwiftInfo();
  console.log(`  CTV SWIFT Info:   BIC=${swiftInfo.bic} | Name=${swiftInfo.nombre} | CLABE=${swiftInfo.clabe} | Corr=${swiftInfo.corresponsal}`);

  // ── 5. Mint initial GNC as backing test (1M GNC = 1M CNY = first QR trigger batch) ──
  console.log("\n── 5. Acuñando GNC inicial (1M CNY → 1M GNC) ──");
  const initialBacking = ethers.parseEther("1000000"); // 1M GNC
  const proof1 = ethers.keccak256(
    ethers.toUtf8Bytes("QR-TRIGGER-V1-20260622-1M-CNY")
  );
  const tx2 = await gnc.contract.acunarGanancia(ADDR, initialBacking, proof1);
  await tx2.wait();
  console.log(`  ✓ Acuñado: 1,000,000 GNC → ${ADDR}`);
  console.log(`  ✓ TX: ${tx2.hash}`);
  console.log(`  GNC Supply ahora: ${ethers.formatEther(await gnc.contract.totalSupply())} GNC`);
  console.log(`  GNC Backing ahora: ${ethers.formatEther(await gnc.contract.totalCnyBacked())} CNY`);

  // ── 6. Convertir 10,000 GNC → 10 CTV (test de libre usanza) ──
  console.log("\n── 6. Test: GNC → CTV conversión libre usanza ──");
  const gncAmount = ethers.parseEther("10000"); // 10,000 GNC
  // Need to approve CTV contract to burn GNC? No — GNC.convertirACautivo burns directly
  const tx3 = await gnc.contract.convertirACautivo(gncAmount);
  await tx3.wait();
  console.log(`  ✓ Convertido: 10,000 GNC → 10 CTV`);
  console.log(`  ✓ TX: ${tx3.hash}`);
  console.log(`  GNC Balance deployer: ${ethers.formatEther(await gnc.contract.balanceOf(ADDR))} GNC`);
  console.log(`  CTV Balance deployer: ${ethers.formatEther(await ctv.contract.balanceOf(ADDR))} CTV`);

  // ── 7. Save to contracts.json ──
  console.log("\n── 7. Guardando en contracts.json ──");
  const fs = require("fs");
  const path = require("path");
  const contractsPath = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts.json");
  const existing = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
  existing.push({ name: "GananciaToken", address: gnc.address });
  existing.push({ name: "TokenCautivo", address: ctv.address });
  fs.writeFileSync(contractsPath, JSON.stringify(existing, null, 2));
  console.log(`  ✓ GNC + CTV agregados → ${contractsPath}`);
  console.log(`  ✓ Total contratos: ${existing.length}`);

  // ── Resumen ──
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  GNC + CTV DEPLOY COMPLETADO");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  GNC: ${gnc.address}`);
  console.log(`  CTV: ${ctv.address}`);
  console.log(`  Bridge: GNC ↔ CTV (1 CTV = 1,000 GNC)`);
  console.log(`  Libre Usanza: ACTIVA para deployer`);
  console.log(`  TXs ejecutadas: 3 (deploy GNC, deploy CTV, link, mint, convert)`);
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("DEPLOY FAILED:", err.message);
  process.exit(1);
});
