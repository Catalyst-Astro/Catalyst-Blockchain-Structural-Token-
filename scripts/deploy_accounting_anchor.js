// deploy_accounting_anchor.js — Deploy AccountingAnchor + fund treasury with ETH
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = "0x7bb22e84217F4c8f10AD0792E1ae54d77B36D546";

  // ── 1. Deploy AccountingAnchor ──
  console.log("Deploying AccountingAnchor...");
  const factory = await ethers.getContractFactory("AccountingAnchor");
  const anchor = await factory.deploy(deployer.address);
  await anchor.waitForDeployment();
  const anchorAddr = await anchor.getAddress();
  console.log(`  AccountingAnchor: ${anchorAddr}`);

  // ── 2. Fund treasury with ETH for gas ──
  const ethBal = await ethers.provider.getBalance(treasury);
  if (ethBal < ethers.parseEther("1.0")) {
    console.log("\nSending 10 ETH to treasury for gas...");
    const tx = await deployer.sendTransaction({
      to: treasury,
      value: ethers.parseEther("10.0"),
    });
    await tx.wait();
    console.log(`  TX: ${tx.hash}`);
  } else {
    console.log(`\nTreasury already has ${ethers.formatEther(ethBal)} ETH`);
  }

  // ── 3. Verify ──
  const treasuryETH = await ethers.provider.getBalance(treasury);
  console.log(`\nTreasury ETH: ${ethers.formatEther(treasuryETH)} ETH`);
  console.log(`Treasury:     ${treasury}`);

  // ── 4. Test anchor ──
  const day0 = 0; // day 0 = June 17, 2026
  const testHash = ethers.keccak256(ethers.toUtf8Bytes("test_closure_2026_06_17"));
  const tx2 = await anchor.anchor(
    day0,
    testHash,
    testHash,
    86, // 86 accounts
    ethers.parseEther("354220010"),
    ethers.parseEther("354220010")
  );
  await tx2.wait();
  console.log(`\nTest anchor for day ${day0}: OK`);
  console.log(`  TX: ${tx2.hash}`);

  const stored = await anchor.getAnchor(day0);
  console.log(`  Stored hash: ${stored.closureHash}`);

  // Update contracts.json
  const fs = require("fs");
  const path = require("path");
  const contractsPath = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts.json");
  const contracts = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
  contracts.push({ name: "AccountingAnchor", address: anchorAddr });
  fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
  console.log(`\n  AccountingAnchor added to contracts.json`);
  console.log(`  Total contracts: ${contracts.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
