// =============================================================================
// mint_tokens.js — Mintea CAT y FRT para cualquier address
// =============================================================================
// Uso:
//   npx hardhat run scripts/mint_tokens.js --network localhost
//
// Mintea tokens de los contratos desplegados y los envía a la dirección
// especificada abajo (cambiar RECIPIENT por tu address de MetaMask).
// =============================================================================

const { ethers } = require("hardhat");

// ─── CAMBIÁ ESTO POR TU ADDRESS DE METAMASK ───
const RECIPIENT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat #0
// ⬆ Reemplazá con tu address real de MetaMask

const contracts = require("../apps/catalyst-studio/src/contracts.json");

function getAddr(name) {
  const c = contracts.find((c) => c.name === name);
  if (!c) throw new Error(`Contract ${name} not found`);
  return c.address;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n  Deployer: ${deployer.address}`);
  console.log(`  Recipient: ${RECIPIENT}\n`);

  // ── CAT Token ──
  const catAddr = getAddr("CatalystToken");
  const cat = await ethers.getContractAt("CatalystToken", catAddr);

  console.log("── CatalystToken (CAT) ──");
  console.log(`  Name:   ${await cat.name()}`);
  console.log(`  Symbol: ${await cat.symbol()}`);
  console.log(`  Supply: ${ethers.formatEther(await cat.totalSupply())} CAT`);

  // Ejecutar inflación (mint anual)
  try {
    const tx1 = await cat.mintInflation();
    await tx1.wait();
    console.log(`  ✓ mintInflation() ejecutado — TX: ${tx1.hash}`);
  } catch (e) {
    console.log(`  ⚠ mintInflation: ${e.message.slice(0, 60)}`);
  }

  // Enviar tokens al recipiente
  const catBalance = await cat.balanceOf(deployer.address);
  const catSend = catBalance / 10n; // Enviar 10% del balance
  if (catSend > 0n) {
    const tx2 = await cat.transfer(RECIPIENT, catSend);
    await tx2.wait();
    console.log(`  ✓ Enviado ${ethers.formatEther(catSend)} CAT → ${RECIPIENT}`);
    console.log(`    TX: ${tx2.hash}`);
  }

  // ── FRT Token ──
  const frtAddr = getAddr("InflationaryRewardToken");
  const frt = await ethers.getContractAt("InflationaryRewardToken", frtAddr);

  console.log("\n── Fractal Reward Token (FRT) ──");
  console.log(`  Name:   ${await frt.name()}`);
  console.log(`  Symbol: ${await frt.symbol()}`);
  console.log(`  Supply: ${ethers.formatEther(await frt.totalSupply())} FRT`);

  // Reward al recipiente
  try {
    const rewardAmount = ethers.parseEther("50000");
    const tx3 = await frt.reward(RECIPIENT, rewardAmount);
    await tx3.wait();
    console.log(`  ✓ Reward ${ethers.formatEther(rewardAmount)} FRT → ${RECIPIENT}`);
    console.log(`    TX: ${tx3.hash}`);
  } catch (e) {
    console.log(`  ⚠ reward: ${e.message.slice(0, 60)}`);
  }

  // ── Balances finales ──
  console.log("\n── Balances en " + RECIPIENT + " ──");
  console.log(`  CAT:  ${ethers.formatEther(await cat.balanceOf(RECIPIENT))} CAT`);
  console.log(`  FRT:  ${ethers.formatEther(await frt.balanceOf(RECIPIENT))} FRT`);
  console.log(`  ETH:  ${ethers.formatEther(await ethers.provider.getBalance(RECIPIENT))} ETH`);

  // ── Instrucciones MetaMask ──
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  PARA VER TUS TOKENS EN METAMASK:");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("  1. Abrí MetaMask → Import tokens");
  console.log(`  2. CAT:  ${catAddr}`);
  console.log(`  3. FRT:  ${frtAddr}`);
  console.log("");
  console.log("  O usá: scripts/importar_tokens_metamask.html");
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
