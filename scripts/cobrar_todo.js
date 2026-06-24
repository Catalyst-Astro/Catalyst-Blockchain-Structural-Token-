// cobrar_todo.js — Transfer ALL CAT back to deployer + COBRAR via API
// Reads treasury key from file (not hardcoded in command line)
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const dest = deployer.address;

  // Read treasury key from JSON file
  const treasuryData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "Eincode", "arke", "treasury_wallet_100m.json"),
      "utf8"
    )
  );
  const treasuryKey = treasuryData.privateKey;
  const treasuryAddr = treasuryData.address;
  const treasurySigner = new ethers.Wallet(treasuryKey, ethers.provider);

  // Load contract addresses
  const contracts = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "..", "apps", "catalyst-studio", "src", "contracts.json"),
      "utf8"
    )
  );
  const catAddr = contracts.find(c => c.name === "CatalystToken").address;
  const gncAddr = contracts.find(c => c.name === "GananciaToken").address;
  const ctvAddr = contracts.find(c => c.name === "TokenCautivo").address;

  const cat = new ethers.Contract(catAddr, [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function totalSupply() view returns (uint256)",
    "function totalBurned() view returns (uint256)",
  ], ethers.provider);

  const gnc = new ethers.Contract(gncAddr, [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ], ethers.provider);

  const ctv = new ethers.Contract(ctvAddr, [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ], ethers.provider);

  // ── Check current state ──
  console.log("=== ESTADO ACTUAL ===");
  const treasuryCAT = await cat.balanceOf(treasuryAddr);
  const treasuryGNC = await gnc.balanceOf(treasuryAddr);
  const treasuryCTV = await ctv.balanceOf(treasuryAddr);

  console.log(`Treasury (${treasuryAddr.slice(0,10)}...):`);
  console.log(`  CAT: ${ethers.formatEther(treasuryCAT)}`);
  console.log(`  GNC: ${ethers.formatEther(treasuryGNC)}`);
  console.log(`  CTV: ${ethers.formatEther(treasuryCTV)}`);

  console.log(`\nDeployer (${dest.slice(0,10)}...):`);
  console.log(`  CAT: ${ethers.formatEther(await cat.balanceOf(dest))}`);
  console.log(`  ETH: ${ethers.formatEther(await ethers.provider.getBalance(dest))}`);

  // ── Fund treasury with gas if needed ──
  const treasuryEth = await ethers.provider.getBalance(treasuryAddr);
  if (treasuryEth < ethers.parseEther("0.01")) {
    console.log("\nEnviando 0.5 ETH para gas a treasury...");
    const txGas = await deployer.sendTransaction({ to: treasuryAddr, value: ethers.parseEther("0.5") });
    await txGas.wait();
  }

  // ── Transfer ALL tokens to deployer ──
  console.log("\n=== TRANSFIRIENDO TODO AL DEPLOYER ===");

  const catT = cat.connect(treasurySigner);
  if (treasuryCAT > 0n) {
    const tx = await catT.transfer(dest, treasuryCAT);
    await tx.wait();
    console.log(`[OK] CAT: ${ethers.formatEther(treasuryCAT)} -> deployer`);
  }

  const gncT = gnc.connect(treasurySigner);
  if (treasuryGNC > 0n) {
    const tx = await gncT.transfer(dest, treasuryGNC);
    await tx.wait();
    console.log(`[OK] GNC: ${ethers.formatEther(treasuryGNC)} -> deployer`);
  }

  const ctvT = ctv.connect(treasurySigner);
  if (treasuryCTV > 0n) {
    const tx = await ctvT.transfer(dest, treasuryCTV);
    await tx.wait();
    console.log(`[OK] CTV: ${ethers.formatEther(treasuryCTV)} -> deployer`);
  }

  // Also get CAT from pool
  const poolAddr = contracts.find(c => c.name === "CAT_ETH_Pool")?.address;
  if (poolAddr) {
    const poolCAT = await cat.balanceOf(poolAddr);
    if (poolCAT > 0n) {
      try {
        const poolContract = new ethers.Contract(poolAddr, [
          "function withdrawERC20(address token, address to, uint256 amount) external",
          "function withdrawETH(address to, uint256 amount) external",
        ], treasurySigner);
        await poolContract.withdrawERC20(catAddr, dest, poolCAT);
        console.log(`[OK] Pool CAT: ${ethers.formatEther(poolCAT)} -> deployer`);
      } catch(e) { console.log(`[WARN] Pool: ${e.message.slice(0,60)}`); }
    }
  }

  // ── Execute COBRAR to send SPEI ──
  const finalCAT = await cat.balanceOf(dest);
  console.log(`\n=== DEVOLUCION TOTAL ===`);
  console.log(`Deployer CAT: ${ethers.formatEther(finalCAT)}`);
  console.log(`Valor MXN:    $${(parseFloat(ethers.formatEther(finalCAT)) * 2.0).toLocaleString()} MXN`);
  console.log(`Valor USD:    $${(parseFloat(ethers.formatEther(finalCAT)) * 0.10).toLocaleString()} USD`);

  // Send SPEI to CLABE
  try {
    const http = require("http");
    const payload = JSON.stringify({
      amount_cat: parseFloat(ethers.formatEther(finalCAT)),
      clabe: "012290015202390246",
      recipient_name: "Mauricio Rodriguez Tellez",
      concept: "DEVOLUCION TOTAL BANQUERO - Catalyst Bank",
    });
    console.log(`\nEnviando COBRAR por ${ethers.formatEther(finalCAT)} CAT...`);
    await new Promise((resolve, reject) => {
      const req = http.request({ hostname: "localhost", port: 8000, path: "/api/cobrar", method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
        let d = ""; res.on("data", c => d += c);
        res.on("end", () => { console.log("SPEI:", d.slice(0,200)); resolve(); });
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  } catch(e) { console.log("SPEI via API:", e.message); }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
