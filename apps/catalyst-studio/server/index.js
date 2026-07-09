// =============================================================================
// Catalyst Bank Server — Bitso SPEI Payout API + On-Chain Verification
// =============================================================================
// Endpoints:
//   POST /api/cobrar          → Burn CAT on-chain + SPEI payout via Bitso
//   GET  /api/spei/status/:id → Check payout status
//   GET  /api/fx/quote        → Get CAT→MXN exchange rate
//   GET  /api/balance         → Get wallet + Bitso balance
//   POST /api/webhooks/bitso  → Receive Bitso payout confirmations
//   GET  /api/transactions    → Transaction history
// =============================================================================

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { BitsoBusinessClient, BitsoSandboxClient } = require("./bitso_client");
const { createStripeHandler } = require("./stripe_handler");
const { createPaymentEngine } = require("./payment_engine");
const { createBankEngine } = require("./bank_engine");
const { createCEPHandler } = require("./cep_handler");
const { createYamlRoutes, getConfig } = require("./yaml_config");
const { ethers } = require("ethers");

// ── Config ──
const PORT = process.env.PORT || 8000;
const CHAIN_RPC = process.env.CHAIN_RPC || process.env.HARDHAT_RPC || "https://mainnet.base.org";
const SANDBOX = process.env.BITSO_SANDBOX !== "false";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

// ── Init Bitso Client ──
let bitso;
if (SANDBOX || !process.env.BITSO_API_KEY) {
  console.log("🏦 Bitso SANDBOX mode (no real money)");
  bitso = new BitsoSandboxClient();
} else {
  console.log("🔐 Bitso PRODUCTION mode (REAL money)");
  bitso = new BitsoBusinessClient({
    apiKey: process.env.BITSO_API_KEY,
    apiSecret: process.env.BITSO_API_SECRET,
    sandbox: false,
  });
}

// ── Ethereum Provider ──
let provider;
try {
  const isLocalhost = CHAIN_RPC.includes("127.0.0.1") || CHAIN_RPC.includes("localhost");
  if (isLocalhost) {
    const net = new ethers.Network("localhost", 31337);
    provider = new ethers.JsonRpcProvider(CHAIN_RPC, net, { staticNetwork: net });
    console.log("🏠 Localhost provider (chain 31337)");
  } else {
    provider = new ethers.JsonRpcProvider(CHAIN_RPC);
  }
} catch (e) {
  console.log("⚠️ Provider fallback:", e.message.slice(0,60));
  provider = new ethers.JsonRpcProvider(CHAIN_RPC);
}
let signer = null;
let deployerAddress = null;

async function initSigner() {
  if (PRIVATE_KEY) {
    try {
      signer = new ethers.Wallet(PRIVATE_KEY, provider);
      deployerAddress = await signer.getAddress();
      const bal = await provider.getBalance(deployerAddress);
      console.log(`🔑 Signer: ${deployerAddress.slice(0,10)}... (${ethers.formatEther(bal).slice(0,6)} ETH)`);
      return;
    } catch (e) {
      console.log("⚠️ Invalid PRIVATE_KEY, trying getSigner fallback...");
    }
  }
  try {
    signer = await provider.getSigner(0);
    deployerAddress = await signer.getAddress();
    console.log(`🔑 Signer (node): ${deployerAddress.slice(0,10)}...`);
  } catch (e) {
    console.log("⚠️ No signer available — burns will be simulated");
  }
}

// Detect chain and load appropriate contracts
let contracts = [];
let chainId = 0;
let networkName = "unknown";

async function loadContracts() {
  try {
    const network = await provider.getNetwork();
    chainId = Number(network.chainId);
    networkName = network.name;

    let contractsFile;
    if (chainId === 8453) {
      contractsFile = "contracts_base.json";           // Base Mainnet
    } else if (chainId === 11155111) {
      contractsFile = "contracts_sepolia.json";        // Sepolia Testnet (29 contratos)
    } else if (chainId === 31337 || chainId === 1337) {
      contractsFile = "contracts.json";                // Hardhat Localhost
    } else {
      contractsFile = "contracts.json";                // fallback
    }

    const contractsPath = path.join(__dirname, "..", "src", contractsFile);
    if (fs.existsSync(contractsPath)) {
      contracts = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
      console.log(`📋 ${contracts.length} contratos (${contractsFile}) — chain ${chainId}`);
    } else {
      console.log(`⚠️ ${contractsFile} no encontrado — SPEI-only mode`);
    }
  } catch (e) {
    console.log("⚠️ Chain detection failed — contracts not loaded");
  }
}

function getAddr(name) {
  const c = contracts.find((c) => c.name === name);
  if (!c) throw new Error(`${name} not found in contracts (chain ${chainId})`);
  return c.address;
}

// ── BigInt-safe JSON serialization ──
function toJSON(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  ));
}

// ── Express App ──
const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "..", "dist")));

// Stripe Payment Gateway (test)
app.use("/api/stripe", createStripeHandler());

// REAL Payment Engine (card → COBRAR → SPEI → CLABE)
app.use("/api/pay", createPaymentEngine());

// ISO 8583 BANK ENGINE (auth hold → capture → settlement)
app.use("/api/bank", createBankEngine());

// ═══════════════════════════════════════════════════════════
//  PayPal Checkout API — Orders v2 (MXN)
// ═══════════════════════════════════════════════════════════
app.post("/api/paypal/checkout", (req, res) => {
  const { amount, concept } = req.body;
  const monto = parseFloat(amount);
  if (!monto || monto <= 0) return res.status(400).json({ error: "Monto invalido" });

  // PayPal Orders v2 simulation
  const orderId = "PAYPAL-" + Date.now() + "-" + crypto.randomBytes(4).toString("hex");
  const approveUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;

  res.json({
    success: true,
    order_id: orderId,
    status: "CREATED",
    intent: "CAPTURE",
    amount: { currency: "MXN", value: monto.toFixed(2) },
    concept: concept || "Catalyst Bank Payment",
    approve_url: approveUrl,
    paypal_sandbox: "https://developer.paypal.com",
    next_steps: {
      production: "Replace sandbox with live Client ID from PayPal Developer Dashboard",
      webhook: "Configure webhook URL for PAYMENT.CAPTURE.COMPLETED",
      withdraw: "PayPal balance → CLABE 012290015202390246 (24-48h)",
    },
  });
});

app.get("/api/paypal/config", (req, res) => {
  res.json({
    success: true,
    paypal_business_required: true,
    clabe_for_withdrawal: "012290015202390246",
    setup_steps: [
      "1. Create PayPal Business account: paypal.com/mx/business",
      "2. Verify identity (INE, comprobante domicilio)",
      "3. Link CLABE 012290015202390246 for withdrawals",
      "4. Get API credentials: developer.paypal.com",
      "5. Set MXN as default currency",
    ],
    checkout_integration: {
      endpoint: "POST /api/paypal/checkout",
      method: "Orders API v2",
      currency: "MXN",
      sandbox_url: "https://www.sandbox.paypal.com",
    },
    card_to_paypal: {
      pan: "4761 1220 2400 0005 (Visa Infinite)",
      holder: "Mauricio Rodriguez Tellez",
      expiry: "06/2030",
      note: "PayPal validates with $1 USD temporary charge (reimbursed)",
    },
  });
});

// CEP — Sistema Propio de Verificación de Pagos (emula Banxico)
app.use("/cep", createCEPHandler());

// YAML CONFIG — Configuracion maestra del sistema
app.use("/api/yaml", createYamlRoutes());

// ═══════════════════════════════════════════════════════════
//  GET /api/checks — Pan Am UTF-38 Certified Bearer Checks
// ═══════════════════════════════════════════════════════════
app.get("/api/checks", (req, res) => {
  try {
    const checkPath = path.join(__dirname, "..", "..", "..", "Eincode", "arke", "panam_utf38_checkbook.json");
    if (!fs.existsSync(checkPath)) return res.json({ success: false, error: "Chequera no encontrada. Ejecuta: python scripts/utf38_protection.py" });
    const data = JSON.parse(fs.readFileSync(checkPath, "utf8"));
    res.json({ success: true, sistema: data.sistema, proteccion: data.proteccion, fecha: data.fecha, total_cheques: data.total_cheques, todos_integros: data.todos_integros, cheques: data.cheques, sello: data.sello_master });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/checks/:id — Single check
app.get("/api/checks/:id", (req, res) => {
  try {
    const checkPath = path.join(__dirname, "..", "..", "..", "Eincode", "arke", "panam_utf38_checkbook.json");
    const data = JSON.parse(fs.readFileSync(checkPath, "utf8"));
    const found = data.cheques.find(c => c.check_id === req.params.id);
    if (!found) return res.status(404).json({ error: "Cheque no encontrado" });
    res.json({ success: true, cheque: found });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PayPal page
app.get("/paypal", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "paypal-integration.html"));
});

// ── Transaction log ──
const txLogPath = path.join(__dirname, "transactions.json");
let txLog = [];
try {
  txLog = JSON.parse(fs.readFileSync(txLogPath, "utf8"));
} catch (e) {
  txLog = [];
}

function saveTxLog() {
  fs.writeFileSync(txLogPath, JSON.stringify(txLog, null, 2));
}

function proofChain(seed) {
  const p1 = crypto.createHash("sha256").update(seed + "_identity").digest("hex");
  const p2 = crypto.createHash("sha256").update(p1 + "_amount").digest("hex");
  const p3 = crypto.createHash("sha256").update(p2 + "_ts").digest("hex");
  const p4 = crypto.createHash("sha256").update(p3 + "_burn").digest("hex");
  const p5 = crypto.createHash("sha256").update(p4 + "_final").digest("hex");
  return { p1, p2, p3, p4, p5 };
}

// ═══════════════════════════════════════════════════════════
//  SIWE — Sign-In with Ethereum (Auth Endpoints)
// ═══════════════════════════════════════════════════════════
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const sessions = new Map(); // token -> { address, role, expires }

function createSession(address, role = "admin") {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { address, role, expires: Date.now() + 86400000 });
  return token;
}

// POST /api/auth/challenge
app.post("/api/auth/challenge", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "address required" });
  const challenge = `Catalyst Bank SIWE — Login ${Date.now()} — ${address.slice(0,10)}`;
  res.json({ challenge, address });
});

// POST /api/auth/verify
app.post("/api/auth/verify", (req, res) => {
  const { address, signature, challenge } = req.body;
  if (!address || !signature) return res.status(400).json({ error: "address and signature required" });

  // For localhost: accept any signature as valid (dev mode)
  const token = createSession(address, "admin");
  console.log(`Auth: ${address.slice(0,10)}... logged in as admin`);
  res.json({ token, role: "admin", address });
});

// GET /api/auth/session
app.get("/api/auth/session", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ authenticated: false });
  const token = auth.slice(7);
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, role: session.role, address: session.address });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) sessions.delete(auth.slice(7));
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/clabes — Lista de CLABEs del banco
// ═══════════════════════════════════════════════════════════
app.get("/api/clabes", (req, res) => {
  try {
    const dbPath = path.join(__dirname, "..", "..", "..", "app.db");
    if (fs.existsSync(dbPath)) {
      const Database = require("better-sqlite3");
      const db = new Database(dbPath, { readonly: true });
      const rows = db.prepare("SELECT code, name, bank_details FROM account_catalog WHERE bank_details IS NOT NULL ORDER BY code").all();
      const clabes = rows.map(r => {
        try { return { code: r.code, name: r.name, ...JSON.parse(r.bank_details) }; }
        catch { return { code: r.code, name: r.name }; }
      }).filter(c => c.clabe);
      res.json({ success: true, total: clabes.length, clabes });
    } else {
      res.json({ success: true, clabes: [
        { code: "1102", name: "BBVA Principal", clabe: "012290015202390246", bank: "BBVA" },
        { code: "1103", name: "BBVA Secundaria", clabe: "012180015123243964", bank: "BBVA" },
        { code: "1106", name: "Cuenta USD", clabe: "002290015202390250", bank: "Banamex" },
        { code: "1107", name: "Cuenta EUR", clabe: "012290015202390251", bank: "BBVA" },
        { code: "1108", name: "Crypto Bridge", clabe: "072290015202390252", bank: "Bitso" },
        { code: "0142", name: "Recaudadora", clabe: "014290015202390247", bank: "Santander" },
        { code: "0212", name: "Pagadora", clabe: "021290015202390248", bank: "HSBC" },
        { code: "0322", name: "Inversion", clabe: "032290015202390249", bank: "Banregio" },
      ]});
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
//  POST /api/cobrar — THE MAIN EVENT
// ═══════════════════════════════════════════════════════════
app.post("/api/cobrar", async (req, res) => {
  try {
    const { amount_cat, clabe, recipient_name, concept } = req.body;

    // Validate
    if (!amount_cat || parseFloat(amount_cat) <= 0) {
      return res.status(400).json({ error: "amount_cat requerido y > 0" });
    }
    if (!clabe || !/^\d{18}$/.test(clabe)) {
      return res.status(400).json({ error: "CLABE inválida (18 dígitos)" });
    }
    if (!recipient_name) {
      return res.status(400).json({ error: "recipient_name requerido" });
    }

    // Step 1: Verify on-chain CAT rate from Oracle
    const oracleAddr = getAddr("MXNPriceOracle");
    const oracleAbi = [
      "function getCatMxnRate() view returns (uint256)",
      "function getCatUsdRate() view returns (uint256)",
      "function getUsdMxnRate() view returns (uint256)",
    ];
    const oracle = new ethers.Contract(oracleAddr, oracleAbi, provider);
    const catMxn = await oracle.getCatMxnRate();
    const catUsd = await oracle.getCatUsdRate();
    const usdMxn = await oracle.getUsdMxnRate();

    const catAmountWei = ethers.parseEther(amount_cat.toString());
    const mxnAmount = (catAmountWei * catMxn) / ethers.WeiPerEther;
    const usdAmount =
      (catAmountWei * catUsd) / ethers.WeiPerEther;

    const mxnFormatted = parseFloat(ethers.formatEther(mxnAmount));
    const usdFormatted = parseFloat(ethers.formatEther(usdAmount));

    // Step 2: Generate proof chain
    const seed = `COBRAR_${Date.now()}_${clabe}_${amount_cat}`;
    const proof = proofChain(seed);

    // Step 3: Burn CAT on-chain (requires signer)
    const catAddr = getAddr("CatalystToken");
    const catAbi = [
      "function burn(uint256 amount)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address) view returns (uint256)",
      "function totalBurned() view returns (uint256)",
    ];

    let burnTx = null;
    try {
      if (!signer) {
        throw new Error("No signer configured — set PRIVATE_KEY in .env");
      }
      const cat = new ethers.Contract(catAddr, catAbi, signer);
      const tx = await cat.burn(catAmountWei);
      await tx.wait();
      burnTx = tx.hash;
      console.log(`🔥 Burn on-chain: ${tx.hash.slice(0,20)}...`);
    } catch (burnErr) {
      console.log("⚠️ Burn on-chain falló:", burnErr.message.slice(0, 80));
      if (!SANDBOX) {
        return res.status(500).json({ error: `Burn failed: ${burnErr.message.slice(0, 100)}` });
      }
      burnTx = `sandbox_burn_${Date.now()}`;
    }

    // Step 4: Execute SPEI payout via Bitso
    const payout = await bitso.createSpeiPayout({
      amount_mxn: mxnFormatted.toFixed(2),
      clabe,
      recipient_name,
      concept: concept || `Catalyst COBRAR — ${amount_cat} CAT`,
      internal_ref: proof.p5.slice(0, 32),
    });

    // Step 5: Record transaction
    const tx = {
      id: `CAT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: "COBRAR",
      amount_cat: parseFloat(amount_cat),
      cat_burned: parseFloat(amount_cat) * 0.05,
      mxn_amount: mxnFormatted,
      usd_value: usdFormatted,
      clabe,
      recipient_name,
      bitso_payout_id: payout.payload?.id || "sandbox",
      spei_tracking: payout.payload?.spei_tracking_key || "",
      burn_tx: burnTx,
      proof_chain: proof,
      status: payout.payload?.status || "pending",
    };

    txLog.push(tx);
    saveTxLog();

    res.json({
      success: true,
      transaction: tx,
      rates: {
        cat_mxn: parseFloat(ethers.formatEther(catMxn)),
        cat_usd: parseFloat(ethers.formatEther(catUsd)),
        usd_mxn: parseFloat(ethers.formatEther(usdMxn)),
      },
    });
  } catch (err) {
    console.error("COBRAR ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  GET /api/spei/status/:id
// ═══════════════════════════════════════════════════════════
app.get("/api/spei/status/:id", async (req, res) => {
  try {
    const status = await bitso.getPayoutStatus(req.params.id);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  GET /api/fx/quote — Get current CAT→MXN rate
// ═══════════════════════════════════════════════════════════
app.get("/api/fx/quote", async (req, res) => {
  try {
    const amountCat = parseFloat(req.query.cat) || 100;
    const oracleAddr = getAddr("MXNPriceOracle");
    const oracleAbi = [
      "function getCatMxnRate() view returns (uint256)",
      "function getCatUsdRate() view returns (uint256)",
    ];
    const oracle = new ethers.Contract(oracleAddr, oracleAbi, provider);

    const catMxn = await oracle.getCatMxnRate();
    const catUsd = await oracle.getCatUsdRate();

    const mxnRate = parseFloat(ethers.formatEther(catMxn));
    const usdRate = parseFloat(ethers.formatEther(catUsd));

    // Also get Bitso FX for MXN
    let bitsoQuote = null;
    try {
      bitsoQuote = await bitso.getFxQuote(amountCat * usdRate, "usd", "mxn");
    } catch (e) {
      bitsoQuote = { rate: 20.0, note: "sandbox" };
    }

    res.json({
      success: true,
      oracle: {
        cat_mxn: mxnRate,
        cat_usd: usdRate,
        cat_cny: usdRate * 7.25,
      },
      for_amount: amountCat,
      estimated: {
        mxn: (amountCat * mxnRate).toFixed(2),
        usd: (amountCat * usdRate).toFixed(2),
        cny: (amountCat * usdRate * 7.25).toFixed(2),
      },
      bitso_fx: bitsoQuote,
      burn_5pct: (amountCat * 0.05).toFixed(2),
      net_cat: (amountCat * 0.95).toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  GET /api/balance — Wallet + Bitso balance
// ═══════════════════════════════════════════════════════════
app.get("/api/balance", async (req, res) => {
  try {
    const erc20Abi = [
      "function balanceOf(address) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
    ];
    const catBurnAbi = [
      "function totalBurned() view returns (uint256)",
    ];

    const addr = deployerAddress || "0x0000000000000000000000000000000000000000";
    const treasuryAddr = contracts.find(c => c.name === "Treasury")?.address || addr;

    // CAT — always available
    let catBal = "0", catSupply = "0", catBurned = "0", catMxnRate = "2.00";
    try {
      const catAddr = getAddr("CatalystToken");
      const cat = new ethers.Contract(catAddr, [...erc20Abi, ...catBurnAbi], provider);
      const [bal, sup, burned] = await Promise.all([
        cat.balanceOf(treasuryAddr),
        cat.totalSupply(),
        cat.totalBurned(),
      ]);
      catBal = ethers.formatEther(bal);
      catSupply = ethers.formatEther(sup);
      catBurned = ethers.formatEther(burned);
    } catch (e) { console.log("⚠️ CAT balance unavailable:", e.message.slice(0,50)); }

    // Oracle — try to get rate
    try {
      const oracleAddr = getAddr("MXNPriceOracle");
      const oracleAbi = ["function getCatMxnRate() view returns (uint256)"];
      const oracle = new ethers.Contract(oracleAddr, oracleAbi, provider);
      catMxnRate = ethers.formatEther(await oracle.getCatMxnRate());
    } catch (e) { /* use default 2.00 */ }

    // GNC, CTV, FLT — optional
    let gncBal = "0", ctvBal = "0", fltBal = "0";
    try {
      const gncAddr = getAddr("GananciaToken");
      gncBal = ethers.formatEther(await new ethers.Contract(gncAddr, erc20Abi, provider).balanceOf(treasuryAddr));
    } catch (e) {}
    try {
      const ctvAddr = getAddr("TokenCautivo");
      ctvBal = ethers.formatEther(await new ethers.Contract(ctvAddr, erc20Abi, provider).balanceOf(treasuryAddr));
    } catch (e) {}
    try {
      const fltAddr = getAddr("FractalToken");
      fltBal = ethers.formatEther(await new ethers.Contract(fltAddr, erc20Abi, provider).balanceOf(treasuryAddr));
    } catch (e) {}

    // Bitso balance
    let bitsoBal = null;
    try { bitsoBal = await bitso.getBalances(); } catch (e) { bitsoBal = { note: SANDBOX ? "sandbox" : "unavailable" }; }

    res.json(toJSON({
      success: true,
      network: { chain_id: chainId, name: networkName },
      wallet: treasuryAddr,
      tokens: {
        CAT: {
          balance: catBal,
          totalSupply: catSupply,
          totalBurned: catBurned,
          value_mxn: parseFloat(catBal) * parseFloat(catMxnRate),
          value_usd: parseFloat(catBal) * 0.10,
        },
        GNC: { balance: gncBal },
        CTV: { balance: ctvBal },
        FLT: { balance: fltBal },
      },
      oracle: { cat_mxn: parseFloat(catMxnRate) },
      bitso: bitsoBal,
      treasury_address: treasuryAddr,
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  POST /api/webhooks/bitso — Bitso callback
// ═══════════════════════════════════════════════════════════
app.post("/api/webhooks/bitso", (req, res) => {
  const signature = req.headers["x-bitso-signature"];
  const payload = req.body;

  if (SANDBOX) {
    console.log("📨 Webhook Bitso (sandbox):", payload.event);
    res.json({ received: true });
    return;
  }

  if (!bitso.verifyWebhook(payload, signature)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  console.log("📨 Webhook Bitso:", payload.event, payload.payload?.id);

  // Update transaction log
  const tx = txLog.find(
    (t) => t.bitso_payout_id === payload.payload?.id
  );
  if (tx) {
    tx.status = payload.payload?.status || tx.status;
    tx.webhook_received = new Date().toISOString();
    saveTxLog();
  }

  res.json({ received: true });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/transactions — History
// ═══════════════════════════════════════════════════════════
app.get("/api/transactions", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    success: true,
    total: txLog.length,
    transactions: txLog.slice(-limit).reverse(),
  });
});

// ═══════════════════════════════════════════════════════════
//  ACCOUNTING API — Catálogo, Diario, Mayor, Balanza, Estados Financieros
// ═══════════════════════════════════════════════════════════

// Accounting DB path (same SQLite DB used by Python arke)
const acctDbPath = path.join(__dirname, "..", "..", "..", "app.db");
let acctDb = null;

function getAcctDb() {
  if (!acctDb) {
    try {
      const Database = require("better-sqlite3");
      acctDb = new Database(acctDbPath, { readonly: true });
      console.log(`📚 Contabilidad DB: ${acctDbPath}`);
    } catch (e) {
      console.log(`⚠️ Contabilidad DB no disponible: ${e.message}`);
      return null;
    }
  }
  return acctDb;
}

function acctQuery(sql, params = []) {
  const db = getAcctDb();
  if (!db) return [];
  try {
    return db.prepare(sql).all(...params);
  } catch (e) {
    console.error("SQL Error:", e.message);
    return [];
  }
}

function acctQueryOne(sql, params = []) {
  const db = getAcctDb();
  if (!db) return null;
  try {
    return db.prepare(sql).get(...params);
  } catch (e) {
    console.error("SQL Error:", e.message);
    return null;
  }
}

// GET /api/accounting/catalog
app.get("/api/accounting/catalog", (req, res) => {
  const type = req.query.type;
  let sql = "SELECT * FROM account_catalog WHERE is_active = 1";
  const params = [];
  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  sql += " ORDER BY code";
  const accounts = acctQuery(sql, params);
  res.json({ success: true, total: accounts.length, accounts });
});

// GET /api/accounting/journal
app.get("/api/accounting/journal", (req, res) => {
  const { date, account, source, limit } = req.query;
  let sql = "SELECT * FROM journal_entry WHERE 1=1";
  const params = [];
  if (date) { sql += " AND entry_date = ?"; params.push(date); }
  if (source) { sql += " AND source = ?"; params.push(source); }
  sql += " ORDER BY entry_date DESC, entry_id DESC LIMIT ?";
  params.push(parseInt(limit) || 50);

  const entries = acctQuery(sql, params);
  // If filtering by account, enrich with lines
  const result = entries.map((e) => {
    const lines = account
      ? acctQuery(
          "SELECT * FROM journal_entry_line WHERE entry_id = ? AND account_code = ?",
          [e.entry_id, account]
        )
      : acctQuery(
          "SELECT * FROM journal_entry_line WHERE entry_id = ?",
          [e.entry_id]
        );
    return { ...e, lines };
  }).filter((e) => !account || e.lines.length > 0);

  res.json({ success: true, total: result.length, entries: result });
});

// GET /api/accounting/ledger/:code
app.get("/api/accounting/ledger/:code", (req, res) => {
  const { code } = req.params;
  const { from, to } = req.query;

  let sql = `
    SELECT l.*, j.entry_date, j.description as entry_desc
    FROM journal_entry_line l
    JOIN journal_entry j ON l.entry_id = j.entry_id
    WHERE l.account_code = ?
  `;
  const params = [code];
  if (from) { sql += " AND j.entry_date >= ?"; params.push(from); }
  if (to) { sql += " AND j.entry_date <= ?"; params.push(to); }
  sql += " ORDER BY j.entry_date, j.entry_id";

  const lines = acctQuery(sql, params);

  // Compute running balance
  let running = 0;
  const ledger = lines.map((l) => {
    running += l.debit - l.credit;
    return { ...l, running_balance: Math.round(running * 10000) / 10000 };
  });

  // Get account info
  const acct = acctQueryOne("SELECT * FROM account_catalog WHERE code = ?", [code]);

  res.json({
    success: true,
    account: acct || { code, name: "Desconocida" },
    total_lines: ledger.length,
    final_balance: Math.round(running * 10000) / 10000,
    ledger,
  });
});

// GET /api/accounting/trial-balance
app.get("/api/accounting/trial-balance", (req, res) => {
  const date = req.query.date || "2026-06-22";

  // Get latest balance per account up to date
  const balances = acctQuery(`
    SELECT ab.*, ac.name, ac.type, ac.natural_balance
    FROM account_balance ab
    JOIN account_catalog ac ON ab.account_code = ac.code
    WHERE ab.as_of_date <= ?
    AND ab.id IN (
      SELECT MAX(id) FROM account_balance
      WHERE as_of_date <= ?
      GROUP BY account_code
    )
    ORDER BY ab.account_code
  `, [date, date]);

  const accounts = balances.map((b) => {
    const nat = b.natural_balance;
    let debitBal = 0, creditBal = 0;
    if (nat === "D") {
      debitBal = b.closing_balance > 0 ? b.closing_balance : 0;
      creditBal = b.closing_balance < 0 ? -b.closing_balance : 0;
    } else {
      creditBal = b.closing_balance > 0 ? b.closing_balance : 0;
      debitBal = b.closing_balance < 0 ? -b.closing_balance : 0;
    }
    return {
      code: b.account_code,
      name: b.name,
      type: b.type,
      movement_debit: Math.round(b.total_debit * 100) / 100,
      movement_credit: Math.round(b.total_credit * 100) / 100,
      debit_balance: Math.round(debitBal * 100) / 100,
      credit_balance: Math.round(creditBal * 100) / 100,
    };
  });

  const totals = accounts.reduce(
    (acc, a) => ({
      movement_debit: acc.movement_debit + a.movement_debit,
      movement_credit: acc.movement_credit + a.movement_credit,
      debit_balance: acc.debit_balance + a.debit_balance,
      credit_balance: acc.credit_balance + a.credit_balance,
    }),
    { movement_debit: 0, movement_credit: 0, debit_balance: 0, credit_balance: 0 }
  );

  const diff = Math.abs(totals.movement_debit - totals.movement_credit);

  res.json({
    success: true,
    date,
    accounts,
    totals: {
      movement_debit: Math.round(totals.movement_debit * 100) / 100,
      movement_credit: Math.round(totals.movement_credit * 100) / 100,
      debit_balance: Math.round(totals.debit_balance * 100) / 100,
      credit_balance: Math.round(totals.credit_balance * 100) / 100,
      difference: Math.round(diff * 10000) / 10000,
    },
    is_balanced: diff < 0.01,
    report_type: "TRIAL_BALANCE",
  });
});

// GET /api/accounting/balance-sheet
app.get("/api/accounting/balance-sheet", (req, res) => {
  const date = req.query.date || "2026-06-22";

  function bal(code) {
    const row = acctQueryOne(`
      SELECT closing_balance FROM account_balance
      WHERE account_code = ? AND as_of_date <= ?
      ORDER BY as_of_date DESC LIMIT 1
    `, [code, date]);
    return row ? Math.round(row.closing_balance * 100) / 100 : 0;
  }

  // Activo
  const activo_circulante = {
    "1101_caja": bal("1101"),
    "1102_bbva_principal": bal("1102"),
    "1103_bbva_secundaria": bal("1103"),
    "1104_bitso_custody": bal("1104"),
    "1105_cny_reserve": bal("1105"),
  };
  const activo_digital = {
    "1201_cat": bal("1201"),
    "1202_gnc": bal("1202"),
    "1203_flt": bal("1203"),
    "1204_ctv": bal("1204"),
    "1205_frt": bal("1205"),
    "1206_aim": bal("1206"),
  };
  const activo_receivable = {
    "1301_unionpay_recv": bal("1301"),
    "1302_swift_recv": bal("1302"),
    "1303_bitso_recv": bal("1303"),
    "1304_fees_recv": bal("1304"),
  };

  const total_circulante = Object.values(activo_circulante).reduce((a, b) => a + b, 0);
  const total_digital = Object.values(activo_digital).reduce((a, b) => a + b, 0);
  const total_receivable = Object.values(activo_receivable).reduce((a, b) => a + b, 0);
  const total_activo = total_circulante + total_digital + total_receivable;

  // Pasivo
  const pasivo_depositos = { "2101_mxn": bal("2101"), "2102_cny": bal("2102") };
  const pasivo_settlement = { "2201_swift": bal("2201"), "2202_spei": bal("2202"), "2203_gnc": bal("2203") };
  const pasivo_payables = { "2301_unionpay": bal("2301"), "2302_swift": bal("2302"), "2303_providers": bal("2303") };
  const pasivo_fiscal = { "2401_iva": bal("2401"), "2402_isr": bal("2402") };
  const pasivo_accrued = { "2501_exp": bal("2501"), "2502_int": bal("2502") };

  const total_deposits = Object.values(pasivo_depositos).reduce((a, b) => a + b, 0);
  const total_settlement = Object.values(pasivo_settlement).reduce((a, b) => a + b, 0);
  const total_payables = Object.values(pasivo_payables).reduce((a, b) => a + b, 0);
  const total_fiscal = Object.values(pasivo_fiscal).reduce((a, b) => a + b, 0);
  const total_accrued = Object.values(pasivo_accrued).reduce((a, b) => a + b, 0);
  const total_pasivo = total_deposits + total_settlement + total_payables + total_fiscal + total_accrued;

  // Capital
  const capital_social = { "3101_fijo": bal("3101"), "3102_variable": bal("3102") };
  const aportaciones = { "3201_cat": bal("3201"), "3202_gnc": bal("3202"), "3203_flt": bal("3203") };
  const resultados = { "3301_retained": bal("3301"), "3302_current": bal("3302") };
  const resultado_ejercicio = bal("3401");

  const total_capital_social = Object.values(capital_social).reduce((a, b) => a + b, 0);
  const total_aportaciones = Object.values(aportaciones).reduce((a, b) => a + b, 0);
  const total_resultados = Object.values(resultados).reduce((a, b) => a + b, 0);
  const total_capital = total_capital_social + total_aportaciones + total_resultados + resultado_ejercicio;

  const total_pasivo_capital = total_pasivo + total_capital;
  const diferencia = Math.abs(total_activo - total_pasivo_capital);

  res.json({
    success: true,
    date,
    activo: {
      circulante: { accounts: activo_circulante, total: Math.round(total_circulante * 100) / 100 },
      digital: { accounts: activo_digital, total: Math.round(total_digital * 100) / 100 },
      receivable: { accounts: activo_receivable, total: Math.round(total_receivable * 100) / 100 },
      total_activo: Math.round(total_activo * 100) / 100,
    },
    pasivo: {
      depositos: { accounts: pasivo_depositos, total: Math.round(total_deposits * 100) / 100 },
      settlement: { accounts: pasivo_settlement, total: Math.round(total_settlement * 100) / 100 },
      payables: { accounts: pasivo_payables, total: Math.round(total_payables * 100) / 100 },
      fiscal: { accounts: pasivo_fiscal, total: Math.round(total_fiscal * 100) / 100 },
      accrued: { accounts: pasivo_accrued, total: Math.round(total_accrued * 100) / 100 },
      total_pasivo: Math.round(total_pasivo * 100) / 100,
    },
    capital_contable: {
      capital_social: { accounts: capital_social, total: Math.round(total_capital_social * 100) / 100 },
      aportaciones: { accounts: aportaciones, total: Math.round(total_aportaciones * 100) / 100 },
      resultados: { accounts: resultados, total: Math.round(total_resultados * 100) / 100 },
      resultado_ejercicio: Math.round(resultado_ejercicio * 100) / 100,
      total_capital: Math.round(total_capital * 100) / 100,
    },
    total_pasivo_y_capital: Math.round(total_pasivo_capital * 100) / 100,
    ecuacion_contable: {
      activo: Math.round(total_activo * 100) / 100,
      pasivo_mas_capital: Math.round(total_pasivo_capital * 100) / 100,
      diferencia: Math.round(diferencia * 10000) / 10000,
      balancea: diferencia < 0.01,
    },
    report_type: "BALANCE_SHEET_NIF_C1",
  });
});

// GET /api/accounting/income-statement
app.get("/api/accounting/income-statement", (req, res) => {
  const from = req.query.from || "2026-06-17";
  const to = req.query.to || "2026-06-22";

  function sumMov(code, field) {
    const row = acctQueryOne(`
      SELECT SUM(ab.${field}) as total
      FROM account_balance ab
      WHERE ab.account_code = ? AND ab.as_of_date >= ? AND ab.as_of_date <= ?
    `, [code, from, to]);
    return row && row.total ? Math.round(row.total * 100) / 100 : 0;
  }

  const revenueCodes = ["4101", "4102", "4103", "4104", "4105", "4106", "4201", "4202", "4203"];
  const expenseCodes = ["5101", "5102", "5103", "5104", "5201", "5202", "5203", "5301", "5302", "5303", "5401", "5402"];

  const ingresos = {};
  let totalIngresos = 0;
  for (const c of revenueCodes) {
    const v = sumMov(c, "total_credit");
    ingresos[c] = v;
    totalIngresos += v;
  }

  const gastos = {};
  let totalGastos = 0;
  for (const c of expenseCodes) {
    const v = sumMov(c, "total_debit");
    gastos[c] = v;
    totalGastos += v;
  }

  const utilidadNeta = Math.round((totalIngresos - totalGastos) * 100) / 100;

  res.json({
    success: true,
    period: { from, to },
    ingresos: { servicios: ingresos, total_ingresos: Math.round(totalIngresos * 100) / 100 },
    gastos: { operativos: gastos, total_gastos: Math.round(totalGastos * 100) / 100 },
    utilidad_neta: utilidadNeta,
    report_type: "INCOME_STATEMENT_NIF_C3",
  });
});

// GET /api/accounting/reconciliation
app.get("/api/accounting/reconciliation", (req, res) => {
  const date = req.query.date;
  let sql = "SELECT * FROM reconciliation_log";
  const params = [];
  if (date) { sql += " WHERE reconciliation_date = ?"; params.push(date); }
  sql += " ORDER BY reconciliation_date DESC LIMIT 20";

  const records = acctQuery(sql, params);
  res.json({
    success: true,
    date: date || "all",
    total: records.length,
    reconciliations: records,
    summary: {
      all_matched: records.every((r) => r.is_matched === 1),
      total_variance: Math.round(
        records.reduce((sum, r) => sum + Math.abs(r.variance), 0) * 10000
      ) / 10000,
    },
  });
});

// GET /api/accounting/closure
app.get("/api/accounting/closure", (req, res) => {
  const date = req.query.date;
  let sql = "SELECT * FROM daily_closure";
  const params = [];
  if (date) { sql += " WHERE close_date = ?"; params.push(date); }
  sql += " ORDER BY close_date DESC LIMIT 10";

  const closures = acctQuery(sql, params);
  res.json({ success: true, total: closures.length, closures });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/buzon — Buzon Regulatorio
// ═══════════════════════════════════════════════════════════
app.get("/api/buzon", (req, res) => {
  try {
    const buzonPath = path.join(__dirname, "..", "..", "..", "Eincode", "arke", "buzon_regulatorio.json");
    if (!fs.existsSync(buzonPath)) {
      return res.json({ success: true, outbox: [], inbox: [], daily_log: [] });
    }
    const buzon = JSON.parse(fs.readFileSync(buzonPath, "utf8"));
    const filter = req.query.autoridad;
    let outbox = buzon.outbox || [];
    let inbox = buzon.inbox || [];
    if (filter) {
      outbox = outbox.filter(m => m.to === filter);
      inbox = inbox.filter(m => m.from === filter);
    }
    res.json({
      success: true,
      fecha: new Date().toISOString().slice(0,10),
      outbox_total: outbox.length,
      inbox_total: inbox.length,
      pendientes: outbox.filter(m => !m.acknowledged).length,
      confirmados: outbox.filter(m => m.acknowledged).length,
      outbox: outbox.slice(-20),
      inbox: inbox.slice(-20),
      daily_log: (buzon.daily_log || []).slice(-30),
      autoridades: Object.keys(buzon.authorities || {}),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
//  GET /health
// ═══════════════════════════════════════════════════════════
app.get("/health", async (req, res) => {
  let chainOk = false;
  let blockNum = 0;
  try {
    blockNum = await provider.getBlockNumber();
    chainOk = blockNum > 0;
  } catch (e) {}

  res.json({
    status: "ok",
    mode: SANDBOX ? "sandbox" : "production",
    chain: chainOk ? "connected" : "disconnected",
    chain_id: chainId,
    network: networkName,
    block: blockNum,
    rpc: CHAIN_RPC.replace(/\/\/.*@/, "//***@"), // hide credentials
    contracts: contracts.length,
    transactions: txLog.length,
    bitso: SANDBOX ? "sandbox" : "production",
    signer: deployerAddress ? `${deployerAddress.slice(0,10)}...` : "none",
    app_env: SANDBOX ? "sandbox" : (chainId === 8453 ? "BASE_MAINNET" : "CUSTOM"),
  });
});

// ═══════════════════════════════════════════════════════════
//  GET /api/chain — Network info
// ═══════════════════════════════════════════════════════════
app.get("/api/chain", async (req, res) => {
  try {
    const block = await provider.getBlockNumber();
    const feeData = await provider.getFeeData();
    res.json({
      success: true,
      chain_id: chainId,
      network: networkName,
      block,
      rpc: CHAIN_RPC.replace(/\/\/.*@/, "//***@"),
      deployer: deployerAddress,
      gas: {
        gas_price_gwei: feeData.gasPrice ? parseFloat(ethers.formatUnits(feeData.gasPrice, "gwei")).toFixed(2) : "N/A",
        max_fee_gwei: feeData.maxFeePerGas ? parseFloat(ethers.formatUnits(feeData.maxFeePerGas, "gwei")).toFixed(2) : "N/A",
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start ──
(async () => {
  // Initialize signer and contracts before starting
  await initSigner();
  await loadContracts();

  app.listen(PORT, () => {
    console.log(`
═══════════════════════════════════════════════════════════
  🏦 CATALYST BANK — SPEI Payout Server
  📡 Puerto: ${PORT}
  🏧 Modo: ${SANDBOX ? "SANDBOX (pruebas)" : "PRODUCCIÓN (dinero real)"}
  ⛓️  Chain: ${networkName} (${chainId})
  ⛽ RPC: ${CHAIN_RPC.replace(/\/\/.*@/, "//***@")}
  🔑 Signer: ${deployerAddress ? deployerAddress.slice(0,10)+"..." : "NONE"}
  💳 Bitso: ${SANDBOX ? "Sandbox" : "API Keys configuradas"}

  Endpoints:
    POST /api/cobrar          → Burn CAT + SPEI payout
    GET  /api/spei/status/:id → Payout status
    GET  /api/fx/quote        → Exchange rate
    GET  /api/balance         → Wallet + Bitso
    GET  /api/chain            → Network info
    GET  /api/transactions    → History
    GET  /health              → Server status
═══════════════════════════════════════════════════════════
`);
  });
})();

module.exports = app;
