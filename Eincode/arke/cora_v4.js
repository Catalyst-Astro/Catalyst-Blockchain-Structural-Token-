#!/usr/bin/env node
/**
 * CORA v4 — Uniswap V4 Native Swaps via Universal Router
 * BELL 13450.50 | @uniswap/v4-sdk + Universal Router
 *
 * 100% AUTÓNOMO — V4 swaps directos on-chain.
 * Nivel 1: V4 Native encoding (0x10 V4_SWAP command)
 * Nivel 2: V2 Router fallback
 * Nivel 3: UI link
 *
 * USO:
 *   node Eincode/arke/cora_v4.js --sim      # Simulación
 *   node Eincode/arke/cora_v4.js --live     # EJECUCIÓN REAL
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

function loadEnv() {
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
}
loadEnv();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_RPC = process.env.BASE_RPC || "https://mainnet.base.org";
const CAT = "0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80";
const WETH = "0x4200000000000000000000000000000000000006";
const UNIVERSAL_ROUTER = "0x6ff5693b99212da76ad316178a184ab56d299b43";
const V2_ROUTER = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

// ═══════════════════════════════════════════════════════
class CoraV4 {
  constructor(live = false) {
    this.live = live;
    this.provider = new ethers.JsonRpcProvider(BASE_RPC);
    this.wallet = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, this.provider) : null;
    this.swaps = 0; this.catSwapped = 0; this.ethGanado = 0; this.t0 = Date.now();
  }

  async balances() {
    const catC = new ethers.Contract(CAT, ["function balanceOf(address) view returns (uint256)"], this.provider);
    const c = await catC.balanceOf(this.wallet.address);
    const e = await this.provider.getBalance(this.wallet.address);
    return { cat: parseFloat(ethers.formatEther(c)), eth: parseFloat(ethers.formatEther(e)) };
  }

  calcSize(n, max) {
    return Math.max(50, Math.min(Math.floor(50 * Math.pow(1.02, n)), Math.floor(max * 0.001)));
  }

  /** V4 NATIVE SWAP — command 0x10 encoding directly to Universal Router */
  async v4Swap(amount) {
    const amt = ethers.parseEther(amount.toString());
    const minOut = ethers.parseEther((amount * 0.05 / 3150).toFixed(12));

    // V4_SWAP (0x10) + SETTLE_ALL (0x12) + TAKE_ALL (0x14)
    const commands = ethers.concat([
      new Uint8Array([0x10]), new Uint8Array([0x12]), new Uint8Array([0x14])
    ]);

    // Encode V4 swap params: recipient, amountIn, amountOutMin, currencyIn, currencyOut, fee, tickSpacing, hooks, hookData, zeroForOne
    const abiCoder = new ethers.AbiCoder();
    const swapData = abiCoder.encode(
      ["address", "uint256", "uint256", "address", "address", "uint24", "int24", "address", "bytes", "bool"],
      [this.wallet.address, amt, minOut, CAT, WETH, 3000, 60,
       "0x0000000000000000000000000000000000000000", "0x", true]
    );

    // Settle + Take params
    const settleData = abiCoder.encode(["address", "uint256"], [CAT, amt]);
    const takeData = abiCoder.encode(["address", "uint256"], [WETH, minOut]);

    const inputs = [swapData, settleData, takeData];
    const deadline = Math.floor(Date.now() / 1000) + 600;

    const router = new ethers.Contract(UNIVERSAL_ROUTER,
      ["function execute(bytes,bytes[],uint256) external payable"], this.wallet);

    const tx = await router.execute(commands, inputs, deadline, { gasLimit: 500000 });
    return tx;
  }

  async v2Swap(amount) {
    const r = new ethers.Contract(V2_ROUTER,
      ["function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns (uint256[])"],
      this.wallet);
    const amt = ethers.parseEther(amount.toString());
    const min = ethers.parseEther((amount * 0.07 / 3150).toFixed(12));
    return r.swapExactTokensForETH(amt, min, [CAT, WETH], this.wallet.address,
      Math.floor(Date.now()/1000)+300, { gasLimit: 350000 });
  }

  async execute(amount) {
    if (!this.live || !this.wallet) {
      return { ok: true, sim: true, eth: amount * 0.0926 / 3150 };
    }
    let err = "";

    // LEVEL 1: V4 Native
    try {
      const tx = await this.v4Swap(amount);
      const r = await tx.wait();
      let eth = 0;
      try {
        for (const log of r.logs) {
          eth = Math.max(eth, parseFloat(ethers.formatEther(log.data || "0")));
        }
      } catch (_) {}
      if (eth > 0) {
        this.swaps++; this.catSwapped += amount; this.ethGanado += eth;
        console.log(`  ✅ V4 #${this.swaps} | ${amount} CAT → ${eth.toFixed(6)} ETH | ${tx.hash.slice(0,14)}...`);
        return { ok: true, eth, hash: tx.hash };
      }
      console.log(`  ⚠️ V4 executed but no ETH detected — trying V2`);
    } catch (e) { err = e.message?.slice(0,80); }

    // LEVEL 2: V2 Router
    try {
      const tx = await this.v2Swap(amount);
      const r = await tx.wait();
      const eth = parseFloat(ethers.formatEther(r.logs[r.logs.length-1]?.data || "0"));
      if (eth > 0) {
        this.swaps++; this.catSwapped += amount; this.ethGanado += eth;
        console.log(`  ✅ V2 #${this.swaps} | ${amount} CAT → ${eth.toFixed(6)} ETH | ${tx.hash.slice(0,14)}...`);
        return { ok: true, eth, hash: tx.hash };
      }
    } catch (e) { err = e.message?.slice(0,80); }

    // LEVEL 3: UI
    const link = `https://app.uniswap.org/swap?chain=base&inputCurrency=${CAT}&outputCurrency=ETH&exactField=input&exactAmount=${amount}`;
    console.log(`  🔗 ${link}`);
    return { ok: false, ui: true, url: link, err };
  }

  async run() {
    console.log("═".repeat(55));
    console.log("  CORA v4 — V4 NATIVE + V2 FALLBACK");
    console.log(`  Modo: ${this.live ? '🔴 LIVE' : '🟡 SIM'}`);
    console.log(`  Router: ${UNIVERSAL_ROUTER}`);
    console.log("═".repeat(55));

    if (!this.live) {
      console.log("\n  🟡 Simulación\n");
      for (let i = 0; i < 12; i++)
        console.log(`  ${'🌱'.repeat(Math.min(i/2+1,5))} #${i+1} | ${this.calcSize(i,9e8)} CAT`);
      console.log("\n  node Eincode/arke/cora_v4.js --live");
      return;
    }

    console.log("\n  🔴 LIVE — V4 swaps iniciando...\n");

    // Approve
    try {
      const catC = new ethers.Contract(CAT, ["function approve(address,uint256)","function allowance(address,address) view returns (uint256)"], this.wallet);
      const a = await catC.allowance(this.wallet.address, UNIVERSAL_ROUTER);
      if (a < ethers.parseEther("1000000")) {
        console.log("  🔓 Aprobando CAT...");
        const tx = await catC.approve(UNIVERSAL_ROUTER, ethers.MaxUint256);
        await tx.wait();
        console.log(`  ✅ Aprobado\n`);
      }
    } catch (e) { console.log(`  ⚠️ Approval: ${e.message?.slice(0,60)}\n`); }

    // Loop
    for (let i = 0; i < 5000; i++) {
      const { cat } = await this.balances();
      if (cat < 50) { console.log("  ⚠️ CAT<50"); break; }
      const sz = this.calcSize(this.swaps, cat);
      const r = await this.execute(sz);
      if (r.ui && !r.ok) { await new Promise(s => setTimeout(s, 25000)); continue; }
      if (!r.ok) break;
      if (this.swaps % 25 === 0 && this.swaps > 0) {
        const m = (Date.now()-this.t0)/60000;
        console.log(`\n  🎯 ${this.swaps} swaps | ${this.catSwapped.toLocaleString()} CAT | ${this.ethGanado.toFixed(4)} ETH | ${m.toFixed(1)}min\n`);
      }
      await new Promise(s => setTimeout(s, 15000));
    }

    const m = (Date.now()-this.t0)/60000;
    console.log(`\n═`.repeat(55));
    console.log(`  FINAL | ${this.swaps}swaps | ${this.catSwapped.toLocaleString()}CAT | ${this.ethGanado.toFixed(6)}ETH | ${m.toFixed(1)}min`);
    console.log("═".repeat(55));
  }
}

async function main() {
  const a = process.argv.slice(2);
  await new CoraV4(a.includes("--live") && !a.includes("--sim")).run();
}
main().catch(console.error);
