// yaml_config.js — YAML-based configuration engine
// Replaces hardcoded APIs with YAML-driven configuration
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const YAML_PATH = path.join(__dirname, "..", "..", "..", "catalyst-protocol-v3.yaml");

let config = null;

function loadConfig() {
  try {
    const raw = fs.readFileSync(YAML_PATH, "utf8");
    config = yaml.load(raw);
    console.log(`[YAML] Config cargada: ${YAML_PATH}`);
    return config;
  } catch(e) {
    console.log(`[YAML] Error: ${e.message}`);
    return null;
  }
}

function getConfig() {
  if (!config) return loadConfig();
  return config;
}

function createYamlRoutes() {
  const router = require("express").Router();

  // GET /api/yaml — Full YAML config
  router.get("/", (req, res) => {
    const cfg = getConfig();
    if (!cfg) return res.status(500).json({ error: "YAML not loaded" });
    res.json({ success: true, config: cfg });
  });

  // GET /api/yaml/cuentas — All accounts
  router.get("/cuentas", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, cuentas: cfg?.cuentas || {} });
  });

  // GET /api/yaml/tarjetas — All cards
  router.get("/tarjetas", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, tarjetas: cfg?.tarjetas || {} });
  });

  // GET /api/yaml/lineas — All credit lines
  router.get("/lineas", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, lineas: cfg?.lineas_credito || {} });
  });

  // GET /api/yaml/conectores — All API connectors
  router.get("/conectores", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, conectores: cfg?.conectores || {} });
  });

  // GET /api/yaml/origen — Money origin
  router.get("/origen", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, origen: cfg?.origen || {} });
  });

  // GET /api/yaml/redes — Networks
  router.get("/redes", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, redes: cfg?.redes || {} });
  });

  // GET /api/yaml/contabilidad — Accounting
  router.get("/contabilidad", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, contabilidad: cfg?.contabilidad || {} });
  });

  // GET /api/yaml/ia — IA architecture
  router.get("/ia", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, ia: cfg?.ia || {} });
  });

  // GET /api/yaml/meta — Meta info
  router.get("/meta", (req, res) => {
    const cfg = getConfig();
    res.json({ success: true, meta: cfg?.meta || {} });
  });

  // GET /api/yaml/all — Flat config for frontend
  router.get("/all", (req, res) => {
    const cfg = getConfig();
    if (!cfg) return res.status(500).json({ error: "YAML not loaded" });

    res.json({
      success: true,
      cuentas: cfg.cuentas,
      tarjetas: cfg.tarjetas,
      lineas: cfg.lineas_credito,
      conectores: cfg.conectores,
      origen: cfg.origen,
      redes: cfg.redes,
      contabilidad: cfg.contabilidad,
      app: cfg.app,
      ia: cfg.ia,
      meta: cfg.meta,
    });
  });

  return router;
}

// Load on startup
loadConfig();

module.exports = { createYamlRoutes, getConfig, loadConfig };
