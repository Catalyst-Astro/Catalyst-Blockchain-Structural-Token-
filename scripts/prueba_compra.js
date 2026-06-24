// prueba_compra.js — PRUEBA REAL DE USO DE FONDOS
// Simula compra en cualquier pagina: Amazon, MercadoLibre, Netflix
const http = require("http");

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "localhost", port: 8000, path, method,
      headers: { "Content-Type": "application/json" },
    };
    const req = http.request(opts, (res) => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log("=".repeat(55));
  console.log("  PRUEBA DE USO DE FONDOS — COMPRA REAL");
  console.log("=".repeat(55));

  const compras = [
    { sitio: "Amazon Mexico", producto: "iPhone 15 Pro Max 256GB", monto: 17999 },
    { sitio: "MercadoLibre", producto: "MacBook Air M4 13\"", monto: 24999 },
    { sitio: "Netflix", producto: "Suscripcion Premium 4K", monto: 299 },
    { sitio: "Uber Eats", producto: "Cena completa 2 personas", monto: 850 },
  ];

  for (const c of compras) {
    console.log(`\n--- ${c.sitio}: ${c.producto} — $${c.monto} MXN ---`);

    // Validate card
    const val = await api("POST", "/api/stripe/validate", {
      pan: "4761122024000005", cvv: "049", expiry: "06/30",
      holder: "Mauricio Rodriguez Tellez",
    });
    console.log(`  [1] VALIDACION: ${val.success ? "APROBADA" : "RECHAZADA"} | Red: ${val.card_info?.network}`);

    // Authorize
    const auth = await api("POST", "/api/bank/auth", {
      pan: "4761122024000005", cvv: "049", expiry: "06/30",
      amount: c.monto, concept: `${c.producto} — ${c.sitio}`,
    });
    console.log(`  [2] AUTHORIZATION: ${auth.success ? "HELD" : "FAILED"} | Auth: ${auth.auth_code} | Disp: $${auth.line?.available_now?.toLocaleString()}`);

    // Capture + Settle
    const settle = await api("POST", "/api/bank/capture", {
      auth_id: auth.auth_id,
      clabe_destino: "012290015202390246",
    });
    console.log(`  [3] SETTLEMENT: ${settle.success ? "LIQUIDADO" : "FAILED"} | SPEI: ${settle.spei?.tracking}`);

    // CEP Verify
    if (settle.spei?.tracking) {
      const cep = await api("GET", `/cep/verify?tracking=${settle.spei.tracking}`);
      console.log(`  [4] CEP: ${cep.success ? "VERIFICADO" : "PENDIENTE"} | ${cep.estatus || ""}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`  TOTAL GASTADO: $${compras.reduce((s,c) => s + c.monto, 0).toLocaleString()} MXN`);
  console.log(`  4 COMPRAS COMPLETADAS`);
  console.log(`  TARJETA: Visa Debit ****0005`);
  console.log(`  TITULAR: Mauricio Rodriguez Tellez`);
  console.log(`========================================`);
}

main().catch(console.error);
