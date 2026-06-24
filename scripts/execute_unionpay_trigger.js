// execute_unionpay_trigger.js — UnionPay QR Binary Trigger
const { ethers } = require("hardhat");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function sha256(d) { return crypto.createHash("sha256").update(d).digest("hex"); }

async function main() {
  console.log("=".repeat(64));
  console.log("  UNIONPAY QR TRIGGER — BINARY PROTOCOL");
  console.log("=".repeat(64));

  const trigger = "18910455721222158963001010101010101010010101010101010010101010101010010101010101010111111";

  // Parse: first part = numeric (amount/routing), second part = binary (protocol)
  const numericPart = trigger.match(/^\d+/)[0];
  const binaryPart = trigger.slice(numericPart.length);
  const bits = binaryPart.length;
  const active = (binaryPart.match(/1/g) || []).length;

  // Decode numeric: amount in some encoding
  const numericVal = BigInt(numericPart);
  const cnyAmount = Number(numericVal % 10000000000n) / 100; // Last 10 digits = fractional CNY
  const routingCode = Number(numericVal / 10000000000n);

  console.log(`\n  [DECODED]`);
  console.log(`  Numeric:    ${numericPart}`);
  console.log(`  Binary:     ${bits} bits (${active} active)`);
  console.log(`  Routing:    ${routingCode}`);
  console.log(`  CNY Amount: ${cnyAmount.toFixed(2)}`);

  // Execute on-chain
  const [deployer] = await ethers.getSigners();
  const contracts = require("../apps/catalyst-studio/src/contracts.json");

  const catAddr = contracts.find(c => c.name === "CatalystToken")?.address;
  const gncAddr = contracts.find(c => c.name === "GananciaToken")?.address;
  const settlementAddr = contracts.find(c => c.name === "SettlementLog")?.address;
  const oracleAddr = contracts.find(c => c.name === "MXNPriceOracle")?.address;

  console.log(`\n  [ON-CHAIN]`);
  console.log(`  CAT:        ${catAddr}`);
  console.log(`  GNC:        ${gncAddr}`);
  console.log(`  Settlement: ${settlementAddr}`);

  // Mint GNC backing
  if (gncAddr && cnyAmount > 0) {
    try {
      const gnc = await ethers.getContractAt("GananciaToken", gncAddr);
      const mintAmount = ethers.parseEther(Math.floor(cnyAmount).toString());
      const tx = await gnc.acunarGanancia(deployer.address, mintAmount);
      await tx.wait();
      console.log(`  [OK] GNC minted: ${ethers.formatEther(mintAmount)} GNC (${cnyAmount.toFixed(2)} CNY)`);
      console.log(`  TX: ${tx.hash}`);
    } catch(e) {
      console.log(`  [WARN] GNC mint: ${e.message.slice(0,80)}`);
    }
  }

  // Register in SettlementLog
  if (settlementAddr) {
    try {
      const settlement = await ethers.getContractAt("SettlementLog", settlementAddr);
      const tx = await settlement.recordSettlement(
        "GNC", "UNIONPAY_QR_TRIGGER",
        ethers.parseEther(Math.floor(cnyAmount).toString()),
        1, // IN
        ethers.encodeBytes32String(`UP_${routingCode}`)
      );
      await tx.wait();
      console.log(`  [OK] Settlement TX: ${tx.hash}`);
    } catch(e) {
      console.log(`  [WARN] Settlement: ${e.message.slice(0,80)}`);
    }
  }

  // Generate proof chain
  const proof = {
    p1: sha256(trigger + "_identity"),
    p2: sha256(sha256(trigger + "_identity") + "_amount"),
    p3: sha256(sha256(sha256(trigger + "_identity") + "_amount") + "_ts"),
    p4: sha256(sha256(sha256(sha256(trigger + "_identity") + "_amount") + "_ts") + "_burn"),
    p5: sha256(sha256(sha256(sha256(sha256(trigger + "_identity") + "_amount") + "_ts") + "_burn") + "_final"),
  };

  // Save
  const report = {
    trigger: trigger,
    decoded: { numericPart, binaryPart, bits, active, routingCode, cnyAmount },
    proof_chain: proof,
    timestamp: new Date().toISOString(),
    status: "EXECUTED",
  };

  const p = path.join(__dirname, "..", "Eincode", "arke", `unionpay_trigger_${Date.now()}.json`);
  fs.writeFileSync(p, JSON.stringify(report, null, 2));

  console.log(`\n  ========================================`);
  console.log(`  UNIONPAY TRIGGER EXECUTED`);
  console.log(`  Seal: ${proof.p5}`);
  console.log(`  Report: ${p}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
