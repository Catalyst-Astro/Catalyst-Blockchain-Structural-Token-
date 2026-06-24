const { ethers } = require("hardhat");
const contracts = require("../apps/catalyst-studio/src/contracts.json");
function g(name) { return contracts.find(c => c.name === name).address; }

async function main() {
  const [signer] = await ethers.getSigners();
  const DEST = "0x7bb22e84217F4c8f10AD0792E1ae54d77B36D546";

  const flt = await ethers.getContractAt("FractalToken", g("FractalToken"));
  const wl = await ethers.getContractAt("WhitelistRegistry", g("WhitelistRegistry"));

  // Whitelist + disable compliance gates temporarily
  await wl.approveWallet(DEST, 1);
  console.log("✓ DEST whitelisted");

  // Disable all 4 compliance engines to transfer
  await flt.setWhitelistPolicyEnabled(false);
  await flt.setComplianceEnabled(false);
  await flt.setIdentitySBTEnabled(false);
  await flt.setFreezeEnforcementEnabled(false);
  console.log("✓ Compliance engines OFF (temporal)");

  const fltBal = await flt.balanceOf(signer.address);
  if (fltBal > 0n) {
    const tx = await flt.transfer(DEST, fltBal);
    await tx.wait();
    console.log(`✓ FLT: ${ethers.formatEther(fltBal)} → DEST\n  TX: ${tx.hash}`);
  }

  // Re-enable
  await flt.setWhitelistPolicyEnabled(true);
  await flt.setComplianceEnabled(true);
  await flt.setIdentitySBTEnabled(true);
  await flt.setFreezeEnforcementEnabled(true);
  console.log("✓ Compliance engines ON");

  // FINAL
  const cat = await ethers.getContractAt("CatalystToken", g("CatalystToken"));
  const gnc = await ethers.getContractAt("GananciaToken", g("GananciaToken"));
  const ctv = await ethers.getContractAt("TokenCautivo", g("TokenCautivo"));

  const fCat = await cat.balanceOf(DEST);
  const fGnc = await gnc.balanceOf(DEST);
  const fCtv = await ctv.balanceOf(DEST);
  const fFlt = await flt.balanceOf(DEST);
  const fEth = await ethers.provider.getBalance(DEST);

  const usd = parseFloat(ethers.formatEther(fCat)) * 0.10;
  const cny = parseFloat(ethers.formatEther(fGnc));

  console.log("\n══════════════════════════════════════════");
  console.log("  WALLET DESTINO — BALANCE FINAL");
  console.log("══════════════════════════════════════════");
  console.log(`  ${DEST}`);
  console.log("  ──────────────────────────────────────");
  console.log(`  CAT  ${ethers.formatEther(fCat).padStart(16)} → $${usd.toLocaleString()} USD`);
  console.log(`  GNC  ${ethers.formatEther(fGnc).padStart(16)} → ¥${cny.toLocaleString()} CNY`);
  console.log(`  CTV  ${ethers.formatEther(fCtv).padStart(16)} → Libre Usanza`);
  console.log(`  FLT  ${ethers.formatEther(fFlt).padStart(16)} → Compliance`);
  console.log(`  ETH  ${ethers.formatEther(fEth).padStart(16)} → Gas`);
  console.log("  ──────────────────────────────────────");
  console.log(`  VALOR TOTAL: ~$${usd.toLocaleString()} USD + ¥${cny.toLocaleString()} CNY`);
  console.log("══════════════════════════════════════════");
}

main().catch(e => { console.error(e.message); process.exit(1); });
