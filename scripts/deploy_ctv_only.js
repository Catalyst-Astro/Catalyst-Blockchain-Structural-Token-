// deploy_ctv_only.js — Solo TokenCautivo en Sepolia con gas optimizado
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const ADDR = deployer.address;
  const bal = await ethers.provider.getBalance(ADDR);
  console.log(`Deployer: ${ADDR}`);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH`);

  if (bal < ethers.parseEther("0.0005")) {
    console.log("Muy poco ETH. Necesitas al menos 0.0005 ETH.");
    process.exit(1);
  }

  // GNC address from Sepolia
  const gncAddr = "0xa153b105fa14194D181727c31BA5A1418ba08361";

  console.log("\nDesplegando TokenCautivo (CTV)...");
  const factory = await ethers.getContractFactory("TokenCautivo");

  // Use minimal gas price
  const feeData = await ethers.provider.getFeeData();
  console.log(`Gas price: ${ethers.formatUnits(feeData.gasPrice || 0n, 'gwei')} gwei`);

  const ctv = await factory.deploy(
    ADDR,          // admin
    ADDR,          // swiftIssuer (BCRMXMMPYM)
    gncAddr,       // gananciaBridge
    "BCRMXMMPYM",  // swiftBic
    "012290015202390246" // clabe
  );
  await ctv.waitForDeployment();
  const ctvAddr = await ctv.getAddress();

  console.log(`\n[OK] TokenCautivo: ${ctvAddr}`);
  console.log(`SWIFT BIC: BCRMXMMPYM`);
  console.log(`CLABE:     012290015202390246`);

  // Link GNC ↔ CTV
  console.log("\nVinculando GNC ↔ CTV...");
  const gnc = await ethers.getContractAt("GananciaToken", gncAddr);
  const tx = await gnc.vincularCautivo(ctvAddr, ethers.parseEther("1000"));
  await tx.wait();
  console.log(`[OK] Bridge: 1 CTV = 1,000 GNC`);

  const finalBal = await ethers.provider.getBalance(ADDR);
  console.log(`\nBalance final: ${ethers.formatEther(finalBal)} ETH`);
  console.log(`\n=== 30/30 CONTRATOS EN SEPOLIA ===`);
  console.log(`TokenCautivo: ${ctvAddr}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
