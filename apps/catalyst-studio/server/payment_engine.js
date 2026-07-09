// payment_engine.js — REAL payment processor connecting cards to COBRAR/SPEI
// Cards linked to credit lines, payments execute actual SPEI transfers
const crypto = require("crypto");

function luhn(pan) {
  let s=0, d=false;
  for(let i=pan.length-1; i>=0; i--) { let n=parseInt(pan[i]); if(d){n*=2; if(n>9)n-=9;} s+=n; d=!d; }
  return s%10===0;
}

// Credit lines linked to cards
const CREDIT_LINES = {
  "4761122024000005": { line: "LC-001", name: "Visa Infinite BBVA", mxnAvailable: 79200000, catAvailable: 39600000, clabe: "012290015202390246", pct: 40 },
  "5555552024000000": { line: "LC-002", name: "Mastercard World Operadora", mxnAvailable: 69300000, catAvailable: 34650000, clabe: "012180015123243964", pct: 35 },
  "6282123456000005": { line: "LC-003", name: "UnionPay Platinum Recaudadora", mxnAvailable: 49500000, catAvailable: 24750000, clabe: "014290015202390244", pct: 25 },
  "6282456789000007": { line: "LC-005", name: "Gas Relayer CAT", mxnAvailable: 0, catAvailable: 1000000, clabe: "072290015202390257", pct: "gas", isGas: true },
};

function createPaymentEngine(getProvider) {
  const router = require("express").Router();

  // POST /api/pay — REAL payment: card → COBRAR → SPEI → CLABE destino
  router.post("/pay", async (req, res) => {
    const { pan, cvv, expiry, holder, amount, concept, clabeDestino } = req.body;
    const cleanPAN = (pan||"").replace(/\s/g, "");
    const monto = parseFloat(amount);

    // Validate card
    if (!luhn(cleanPAN)) return res.status(400).json({ success: false, error: "Tarjeta invalida (Luhn)", code: "INVALID_CARD" });
    if (cleanPAN.length !== 16) return res.status(400).json({ success: false, error: "PAN debe ser 16 digitos", code: "INVALID_LENGTH" });
    if (!cvv || cvv.length < 3) return res.status(400).json({ success: false, error: "CVV requerido", code: "MISSING_CVV" });
    if (!monto || monto <= 0) return res.status(400).json({ success: false, error: "Monto invalido", code: "INVALID_AMOUNT" });

    // Find credit line
    const line = CREDIT_LINES[cleanPAN];
    if (!line) return res.status(400).json({ success: false, error: "PAN no vinculado a linea de credito", code: "UNKNOWN_PAN" });
    if (monto > line.mxnAvailable && !line.isGas) return res.status(400).json({ success: false, error: `Monto excede linea disponible: $${line.mxnAvailable.toLocaleString()} MXN`, code: "INSUFFICIENT_CREDIT" });

    // Network detection
    let network = "DESCONOCIDO";
    if (cleanPAN.startsWith("4")) network = "Visa";
    else if (cleanPAN.startsWith("5")) network = "Mastercard";
    else if (cleanPAN.startsWith("62")) network = "UnionPay";

    // Execute REAL payment via COBRAR → SPEI
    const amountCAT = Math.ceil(monto / 2); // 1 CAT = $2 MXN
    const destCLABE = clabeDestino || line.clabe;

    try {
      // Burn CAT + SPEI payout via existing COBRAR endpoint
      const cobrarPayload = JSON.stringify({
        amount_cat: amountCAT,
        clabe: destCLABE,
        recipient_name: holder || "Beneficiario",
        concept: concept || `Pago ${network} ${cleanPAN.slice(-4)} — ${line.name}`,
      });

      const cobrarResult = await new Promise((resolve, reject) => {
        const http = require("http");
        const req = http.request({
          hostname: "localhost", port: 8000, path: "/api/cobrar", method: "POST",
          headers: { "Content-Type": "application/json" },
        }, (resp) => { let d=""; resp.on("data", c=>d+=c); resp.on("end", ()=>resolve(JSON.parse(d))); });
        req.on("error", reject);
        req.write(cobrarPayload);
        req.end();
      });

      if (!cobrarResult.success) {
        return res.status(500).json({ success: false, error: "COBRAR fallo: " + (cobrarResult.error || "unknown"), code: "COBRAR_FAILED" });
      }

      // Update available credit
      line.mxnAvailable -= monto;
      line.catAvailable -= amountCAT;

      const auth = crypto.randomBytes(3).toString("hex").toUpperCase();
      const paymentId = "PAY-" + Date.now();

      res.json({
        success: true,
        payment_id: paymentId,
        status: "APPROVED",
        card: {
          network, bin: cleanPAN.slice(0,6), last4: cleanPAN.slice(-4),
          holder: holder || "MAURICIO RODRIGUEZ TELLEZ", expiry,
        },
        amount: { mxn: monto, cat_burned: amountCAT, cat_fee: Math.round(amountCAT*0.05), usd: (monto/17.35).toFixed(2) },
        credit_line: { id: line.line, name: line.name, remaining_mxn: line.mxnAvailable },
        spei: {
          tracking: cobrarResult.transaction.spei_tracking,
          clabe_destino: destCLABE,
          proof: cobrarResult.transaction.proof_chain?.p5,
        },
        authorization: { code: auth, timestamp: new Date().toISOString() },
        receipt: `https://www.banxico.org.mx/cep/consulta.html?tracking=${cobrarResult.transaction.spei_tracking}`,
      });

      console.log(`[PAY] ${network} ${cleanPAN.slice(-4)} $${monto} MXN → CLABE ${destCLABE.slice(-6)} — APPROVED | SPEI: ${cobrarResult.transaction.spei_tracking}`);
    } catch(e) {
      res.status(500).json({ success: false, error: e.message, code: "ENGINE_ERROR" });
    }
  });

  // GET /api/pay/balance/:pan — Check card balance
  router.get("/balance/:pan", (req, res) => {
    const cleanPAN = (req.params.pan||"").replace(/\s/g, "");
    const line = CREDIT_LINES[cleanPAN];
    if (!line) return res.json({ success: false, error: "Tarjeta no registrada" });
    let network = "DESCONOCIDO";
    if (cleanPAN.startsWith("4")) network = "Visa";
    else if (cleanPAN.startsWith("5")) network = "Mastercard";
    else if (cleanPAN.startsWith("62")) network = "UnionPay";
    res.json({
      success: true,
      card: { network, last4: cleanPAN.slice(-4), bin: cleanPAN.slice(0,6) },
      credit_line: { id: line.line, name: line.name, mxn_available: line.mxnAvailable, cat_available: line.catAvailable, clabe: line.clabe },
    });
  });

  // GET /api/pay/lines — List all credit lines
  router.get("/lines", (req, res) => {
    const lines = Object.entries(CREDIT_LINES).map(([pan, line]) => {
      let network = "DESCONOCIDO";
      if (pan.startsWith("4")) network = "Visa";
      else if (pan.startsWith("5")) network = "Mastercard";
      else if (pan.startsWith("62")) network = "UnionPay";
      return { pan: pan.replace(/(.{4})/g, "$1 ").trim(), last4: pan.slice(-4), network, ...line };
    });
    res.json({ success: true, total: lines.length, lines });
  });

  return router;
}

module.exports = { createPaymentEngine };
