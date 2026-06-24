// Transferir todos los tokens líquidos a wallet separada
const { ethers } = require("hardhat");
const contracts = require("../apps/catalyst-studio/src/contracts.json");
function getAddr(name) { return contracts.find(c => c.name === name).address; }

async function main() {
  const [deployer] = await ethers.getSigners();
  const DEST = "0x7bb22e84217F4c8f10AD0792E1ae54d77B36D546";

  const cat = await ethers.getContractAt("CatalystToken", getAddr("CatalystToken"));
  const gnc = await ethers.getContractAt("GananciaToken", getAddr("GananciaToken"));
  const ctv = await ethers.getContractAt("TokenCautivo", getAddr("TokenCautivo"));
  const flt = await ethers.getContractAt("FractalToken", getAddr("FractalToken"));

  console.log("ANTES:");
  console.log(`  CAT deployer: ${ethers.formatEther(await cat.balanceOf(deployer.address))}`);
  console.log(`  CAT destino:  ${ethers.formatEther(await cat.balanceOf(DEST))}`);

  const catBal = await cat.balanceOf(deployer.address);
  const gncBal = await gnc.balanceOf(deployer.address);
  const ctvBal = await ctv.balanceOf(deployer.address);
  const fltBal = await flt.balanceOf(deployer.address);

  console.log("\nTransfiriendo todos los tokens...\n");

  if (catBal > 0n) {
    const tx = await cat.transfer(DEST, catBal);
    await tx.wait();
    console.log(`✓ CAT: ${ethers.formatEther(catBal)} → DEST`);
    console.log(`  TX: ${tx.hash}`);
  }

  if (gncBal > 0n) {
    const tx = await gnc.transfer(DEST, gncBal);
    await tx.wait();
    console.log(`✓ GNC: ${ethers.formatEther(gncBal)} → DEST`);
    console.log(`  TX: ${tx.hash}`);
  }

  if (ctvBal > 0n) {
    const tx = await ctv.transfer(DEST, ctvBal);
    await tx.wait();
    console.log(`✓ CTV: ${ethers.formatEther(ctvBal)} → DEST`);
    console.log(`  TX: ${tx.hash}`);
  }

  if (fltBal > 0n) {
    const tx = await flt.transfer(DEST, fltBal);
    await tx.wait();
    console.log(`✓ FLT: ${ethers.formatEther(fltBal)} → DEST`);
    console.log(`  TX: ${tx.hash}`);
  }

  // ETH for gas
  const ethTx = await deployer.sendTransaction({ to: DEST, value: ethers.parseEther("10.0") });
  await ethTx.wait();
  console.log(`✓ 10 ETH gas → DEST`);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  BALANCE FINAL — WALLET DESTINO");
  console.log("═══════════════════════════════════════════════════");
  const finalCat = await cat.balanceOf(DEST);
  const finalGnc = await gnc.balanceOf(DEST);
  const finalCtv = await ctv.balanceOf(DEST);
  const finalFlt = await flt.balanceOf(DEST);
  const finalEth = await ethers.provider.getBalance(DEST);

  console.log(`  CAT: ${ethers.formatEther(finalCat)}  →  $${(parseFloat(ethers.formatEther(finalCat)) * 0.10).toLocaleString()} USD`);
  console.log(`  GNC: ${ethers.formatEther(finalGnc)}  →  ¥${parseFloat(ethers.formatEther(finalGnc)).toLocaleString()} CNY`);
  console.log(`  CTV: ${ethers.formatEther(finalCtv)}`);
  console.log(`  FLT: ${ethers.formatEther(finalFlt)}`);
  console.log(`  ETH: ${ethers.formatEther(finalEth)} (gas)`);
  console.log(`\n  DIRECCIÓN: ${DEST}`);
  console.log("═══════════════════════════════════════════════════");
}

main().catch(e => { console.error(e.message); process.exit(1); });
