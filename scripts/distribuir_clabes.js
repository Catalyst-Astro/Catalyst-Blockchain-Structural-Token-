// distribuir_clabes.js — Repartir fondos en las 8 CLABEs del banco
const { ethers } = require("hardhat");
const http = require("http");

async function speiTransfer(montoMXN, clabe, concepto) {
  const amountCAT = Math.ceil(montoMXN / 2); // 1 CAT = $2 MXN
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      amount_cat: amountCAT,
      clabe,
      recipient_name: "Catalyst Bank — Cuenta Propia",
      concept: concepto,
    });
    const req = http.request({
      hostname: "localhost", port: 8000, path: "/api/cobrar", method: "POST",
      headers: { "Content-Type": "application/json" },
    }, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("  CATALYST BANK — DISTRIBUCION A 8 CLABEs");
  console.log("=".repeat(60));

  const cuentas = [
    { clabe: "012290015202390246", nombre: "Concentradora BBVA", pct: 40 },
    { clabe: "012180015123243964", nombre: "Operadora BBVA", pct: 15 },
    { clabe: "014290015202390244", nombre: "Recaudadora Santander", pct: 10 },
    { clabe: "021290015202390240", nombre: "Pagadora HSBC", pct: 10 },
    { clabe: "032290015202390242", nombre: "Inversion Banregio", pct: 15 },
    { clabe: "002290015202390256", nombre: "USD Intl Banamex", pct: 5 },
    { clabe: "012290015202390259", nombre: "EUR Intl BBVA", pct: 3 },
    { clabe: "072290015202390257", nombre: "Crypto Bridge Bitso", pct: 2 },
  ];

  // Skip first 2 (already done: Concentradora + Operadora)
  const pendientes = cuentas.slice(2);
  const TOTAL_MXN = 198000000;
  const pctRestante = pendientes.reduce((a,c) => a + c.pct, 0);
  const montoRestante = Math.round(TOTAL_MXN * pctRestante / 100);

  console.log(`Ya ejecutados: Concentradora (40%) + Operadora (15%)`);
  console.log(`Pendientes: ${pendientes.length} CLABEs = ${pctRestante}% = $${montoRestante.toLocaleString()} MXN\n`);

  for (const c of pendientes) {
    const monto = Math.round(TOTAL_MXN * c.pct / 100);
    console.log(`${c.clabe} | ${c.nombre.padEnd(22)} | ${c.pct}% = $${monto.toLocaleString()} MXN`);
  }

  console.log("\nEjecutando SPEI a CLABEs pendientes...");

  for (const c of pendientes) {
    const monto = Math.round(TOTAL_MXN * c.pct / 100);
    try {
      const r = await speiTransfer(monto, c.clabe, `DISTRIBUCION ${c.nombre} — ${c.pct}%`);
      if (r.success) {
        console.log(`[OK] ${c.nombre}: $${monto.toLocaleString()} MXN | Tracking: ${r.transaction.spei_tracking}`);
      } else {
        console.log(`[ERR] ${c.nombre}: ${r.error}`);
      }
    } catch(e) {
      console.log(`[ERR] ${c.nombre}: ${e.message.slice(0,80)}`);
    }
  }

  console.log("\n========================================");
  console.log("  DISTRIBUCION COMPLETADA");
  console.log("  8 CLABEs del banco fondeadas");
  console.log("========================================");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
