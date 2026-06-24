// gas_relayer.js — Meta-Tx Relayer Service
// Submits user-signed messages to GasRelayer contract, pays ETH gas, receives CAT.
// Users without ETH can execute any contract call using only CAT tokens.
// =============================================================================

const { ethers } = require("ethers");
const express = require("express");
const cors = require("cors");

// ===== GasRelayer Contract ABI =====
const RELAYER_ABI = [
  "function relay(address user, address target, uint256 value, bytes data, uint256 maxCatToPay, uint256 deadline, bytes signature) external returns (bytes)",
  "function estimateGasCost() external view returns (uint256 catCost, uint256 estimatedGas, uint256 gasPrice)",
  "function nonces(address) external view returns (uint256)",
  "function ethPool() external view returns (uint256)",
  "function isRelayer(address) external view returns (bool)",
];

// ===== Configuration =====
const HARDHAT_RPC = process.env.HARDHAT_RPC || "http://127.0.0.1:8545";
const RELAYER_ADDRESS = process.env.RELAYER_ADDRESS || ""; // GasRelayer contract
const RELAYER_PORT = process.env.RELAYER_PORT || 8001;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || "";

// ===== Init =====
const provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
let relayerWallet = null;
let gasRelayer = null;

if (RELAYER_PRIVATE_KEY && RELAYER_ADDRESS) {
  relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
  gasRelayer = new ethers.Contract(RELAYER_ADDRESS, RELAYER_ABI, relayerWallet);
}

// ===== Express App =====
const app = express();
app.use(cors());
app.use(express.json());

// Endpoint: Get gas cost estimate
app.get("/api/gas/estimate", async (req, res) => {
  try {
    if (!gasRelayer) return res.status(503).json({ error: "Relayer not configured" });
    const [catCost, estGas, gasPrice] = await gasRelayer.estimateGasCost();
    res.json({
      success: true,
      catCost: ethers.formatEther(catCost),
      catCostWei: catCost.toString(),
      estimatedGas: estGas.toString(),
      gasPrice: ethers.formatUnits(gasPrice, "gwei"),
      gasPriceWei: gasPrice.toString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint: Get user nonce
app.get("/api/gas/nonce/:address", async (req, res) => {
  try {
    if (!gasRelayer) return res.status(503).json({ error: "Relayer not configured" });
    const nonce = await gasRelayer.nonces(req.params.address);
    res.json({ success: true, address: req.params.address, nonce: nonce.toString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Endpoint: Get ETH pool status
app.get("/api/gas/pool", async (req, res) => {
  try {
    if (!gasRelayer) return res.status(503).json({ error: "Relayer not configured" });
    const pool = await gasRelayer.ethPool();
    const bal = await provider.getBalance(RELAYER_ADDRESS);
    res.json({
      success: true,
      contractETH: ethers.formatEther(pool),
      contractBalance: ethers.formatEther(bal),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// MAIN: Submit a meta-transaction
// Body: { user, target, value, data, maxCatToPay, deadline, signature }
app.post("/api/gas/relay", async (req, res) => {
  try {
    if (!gasRelayer) return res.status(503).json({ error: "Relayer not configured" });
    if (!relayerWallet) return res.status(503).json({ error: "Private key not configured" });

    const { user, target, value = "0", data, maxCatToPay, deadline, signature } = req.body;

    if (!user || !target || !data || !signature) {
      return res.status(400).json({ error: "Missing required fields: user, target, data, signature" });
    }

    // Verify the relayer is authorized
    const relayerOk = await gasRelayer.isRelayer(relayerWallet.address);
    if (!relayerOk) {
      return res.status(403).json({ error: "Relayer not authorized on contract" });
    }

    // Check gas pool
    const pool = await gasRelayer.ethPool();
    if (pool === 0n) {
      return res.status(503).json({ error: "ETH pool empty. Fund the GasRelayer contract." });
    }

    // Submit the meta-transaction
    const tx = await gasRelayer.relay(
      user,
      target,
      ethers.parseEther(value.toString()),
      data,
      ethers.parseEther(maxCatToPay?.toString() || "1000000"),
      deadline || Math.floor(Date.now() / 1000) + 3600,
      signature
    );

    const receipt = await tx.wait();

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      user,
      target,
    });
  } catch (e) {
    console.error("Relay error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get the relayer contract info for building meta-tx
app.get("/api/gas/relayer-info", (req, res) => {
  res.json({
    success: true,
    chainId: provider._network?.chainId,
    relayerContract: RELAYER_ADDRESS,
    relayerAddress: relayerWallet?.address,
    ethPool: "Call /api/gas/pool",
    supportedNetworks: {
      localhost: "http://127.0.0.1:8545 (chainId 31337)",
      baseSepolia: "https://sepolia.base.org (chainId 84532)",
      base: "https://mainnet.base.org (chainId 8453)",
    },
  });
});

// Start
app.listen(RELAYER_PORT, () => {
  console.log(`
========================================
  CAT GAS RELAYER — Meta-Tx Service
========================================
  Puerto: ${RELAYER_PORT}
  RPC:    ${HARDHAT_RPC}
  Contrato: ${RELAYER_ADDRESS || "NO CONFIGURADO"}
  Wallet:   ${relayerWallet ? relayerWallet.address : "NO CONFIGURADA"}

  Endpoints:
    GET  /api/gas/estimate     → Gas cost in CAT
    GET  /api/gas/nonce/:addr   → User nonce
    GET  /api/gas/pool          → ETH pool status
    POST /api/gas/relay         → Submit meta-tx
    GET  /api/gas/relayer-info  → Contract info
========================================
`);
});

module.exports = app;
