import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const admin = deployer.address;

  const ProjectRegistry = await ethers.getContractFactory("ProjectRegistry");
  const projectRegistry = await ProjectRegistry.deploy(admin);
  await projectRegistry.waitForDeployment();
  console.log("ProjectRegistry:", await projectRegistry.getAddress());

  const ValuationLedger = await ethers.getContractFactory("ValuationLedger");
  const valuationLedger = await ValuationLedger.deploy(admin);
  await valuationLedger.waitForDeployment();
  console.log("ValuationLedger:", await valuationLedger.getAddress());

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(admin);
  await treasury.waitForDeployment();
  console.log("Treasury:", await treasury.getAddress());

  const SettlementLog = await ethers.getContractFactory("SettlementLog");
  const settlementLog = await SettlementLog.deploy(admin);
  await settlementLog.waitForDeployment();
  console.log("SettlementLog:", await settlementLog.getAddress());

  console.log("\nSet roles (examples):");
  console.log(`- grant ORACLE_ROLE on ValuationLedger to backend/operator when ready.`);
  console.log(`- setAllowedAsset(address(0), true) on Treasury for ETH (if needed).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
