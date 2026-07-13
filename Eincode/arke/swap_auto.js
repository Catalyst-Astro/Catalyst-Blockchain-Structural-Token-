#!/usr/bin/env node
/**
 * SWAP AUTO — Automatización simple CAT→ETH en Base
 * Sin algoritmos complejos. Solo swaps secuenciales.
 *
 * USO: node Eincode/arke/swap_auto.js
 *      node Eincode/arke/swap_auto.js 100    (swap específico)
 *      node Eincode/arke/swap_auto.js 50 5   (50 CAT, repetir 5 veces)
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, "..", "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const [k, ...v] = t.split("=");
      process.env[k.trim()] = v.join("=").trim();
    }
  }
}

const CAT = "0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80";
const WETH = "0x4200000000000000000000000000000000000006";
const V2 = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";
const V4 = "0x6ff5693b99212da76ad316178a184ab56d299b43";

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) { console.log("❌ PRIVATE_KEY no configurada"); return; }

  const p = new ethers.JsonRpcProvider(process.env.BASE_RPC || "https://mainnet.base.org");
  const w = new ethers.Wallet(pk, p);
  const catC = new ethers.Contract(CAT,
    ["function balanceOf(address) view returns (uint256)",
     "function allowance(address,address) view returns (uint256)",
     "function approve(address,uint256) external returns (bool)"],
    w);

  const args = process.argv.slice(2);
  const swapAmount = parseInt(args[0]) || 50;
  const repeat = parseInt(args[1]) || 3;

  console.log("═".repeat(50));
  console.log(`  SWAP AUTO | ${swapAmount} CAT × ${repeat} | V2+V4`);
  console.log("═".repeat(50));

  // Balances
  const catBal = await catC.balanceOf(w.address);
  const ethBal = await p.getBalance(w.address);
  console.log(`  CAT: ${ethers.formatEther(catBal)}`);
  console.log(`  ETH: ${ethers.formatEther(ethBal)}`);

  if (ethBal < ethers.parseEther("0.00001")) {
    console.log("\n  ⚠️ ETH insuficiente para gas.");
    console.log("  Necesitas ~0.00001 ETH (~$0.03 USD) por swap.");
    console.log("  Deposita ETH desde Bitso a esta wallet en Base.");
    return;
  }

  // Approval
  const allow = await catC.allowance(w.address, V4);
  if (allow < ethers.parseEther("1000000")) {
    console.log("  🔓 Aprobando V4 Router...");
    const tx = await catC.approve(V4, ethers.MaxUint256, { gasLimit: 80000 });
    await tx.wait();
    console.log(`  ✅ ${tx.hash.slice(0,14)}...`);
  }

  const router = new ethers.Contract(V2,
    ["function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns (uint256[])"],
    w);

  // Execute swaps
  for (let i = 1; i <= repeat; i++) {
    const bal = await catC.balanceOf(w.address);
    const remaining = parseFloat(ethers.formatEther(bal));
    if (remaining < swapAmount) {
      console.log(`  ⚠️ Solo quedan ${remaining.toFixed(0)} CAT. Fin.`);
      break;
    }

    const amt = ethers.parseEther(swapAmount.toString());
    const minOut = ethers.parseEther((swapAmount * 0.07 / 3150).toFixed(12));
    const deadline = Math.floor(Date.now() / 1000) + 300;

    console.log(`\n  🔄 Swap ${i}/${repeat}: ${swapAmount} CAT → ? ETH`);

    try {
      const tx = await router.swapExactTokensForETH(
        amt, minOut, [CAT, WETH], w.address, deadline, { gasLimit: 300000 }
      );
      const r = await tx.wait();
      const ethOut = parseFloat(ethers.formatEther(
        r.logs[r.logs.length - 1]?.data || "0"
      ));
      console.log(`  ✅ ${ethOut.toFixed(6)} ETH | ${tx.hash.slice(0,14)}...`);
    } catch (e) {
      const msg = e.message?.slice(0, 100) || "";
      if (msg.includes("CALL_EXCEPTION") || msg.includes("revert")) {
        const link = `https://app.uniswap.org/swap?chain=base&inputCurrency=${CAT}&outputCurrency=ETH&exactField=input&exactAmount=${swapAmount}`;
        console.log(`  ⚠️ V2 falló. Abre manualmente: ${link}`);
      } else {
        console.log(`  ❌ ${msg}`);
      }
    }

    if (i < repeat) await new Promise(r => setTimeout(r, 15000));
  }

  // Final
  const fCat = await catC.balanceOf(w.address);
  const fEth = await p.getBalance(w.address);
  console.log(`\n═`.repeat(50));
  console.log(`  FINAL | CAT: ${ethers.formatEther(fCat)} | ETH: ${ethers.formatEther(fEth)}`);
  console.log("═".repeat(50));
}

main().catch(console.error);
