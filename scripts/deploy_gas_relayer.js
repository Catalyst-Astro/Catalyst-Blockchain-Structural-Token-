// deploy_gas_relayer.js — Deploy GasRelayer + fund with ETH
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const contracts = require("../apps/catalyst-studio/src/contracts.json");
  const catAddr = contracts.find(c => c.name === "CatalystToken").address;
  const oracleAddr = contracts.find(c => c.name === "MXNPriceOracle").address;

  console.log(`Deployer: ${deployer.address}`);
  console.log(`CAT:      ${catAddr}`);
  console.log(`Oracle:   ${oracleAddr}\n`);

  // ── Deploy GasRelayer ──
  const factory = await ethers.getContractFactory("GasRelayer");
  const gasRelayer = await factory.deploy(catAddr, oracleAddr, deployer.address);
  await gasRelayer.waitForDeployment();
  const addr = await gasRelayer.getAddress();
  console.log(`[OK] GasRelayer: ${addr}`);

  // ── Fund with 1 ETH ──
  const tx1 = await gasRelayer.fund({ value: ethers.parseEther("1.0") });
  await tx1.wait();
  console.log(`[OK] Funded with 1 ETH`);
  console.log(`  ETH Pool: ${ethers.formatEther(await gasRelayer.ethPool())} ETH`);

  // Deployer is already authorized as relayer (set in constructor)
  console.log(`[OK] Relayer authorized: ${deployer.address} (constructor)`);

  // ── Estimate gas cost ──
  const [cost, gas, gprice] = await gasRelayer.estimateGasCost();
  console.log(`\n  Gas estimation:`);
  console.log(`    CAT cost:     ${ethers.formatEther(cost)} CAT per tx`);
  console.log(`    Est gas:      ${gas.toString()}`);
  console.log(`    Gas price:    ${ethers.formatUnits(gprice, "gwei")} gwei`);

  // ── Save to contracts.json ──
  const fs = require("fs");
  const path = require("path");
  const cp = path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts.json");
  const all = JSON.parse(fs.readFileSync(cp, "utf8"));
  all.push({ name: "GasRelayer", address: addr });
  fs.writeFileSync(cp, JSON.stringify(all, null, 2));
  console.log(`\n[OK] Guardado. Total: ${all.length} contratos`);

  console.log(`\n========================================`);
  console.log(`  GAS RELAYER LISTO`);
  console.log(`  Los usuarios pagan gas en CAT`);
  console.log(`  Sin necesidad de ETH`);
  console.log(`========================================`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
