const BASE = "";

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Health ──
export async function getHealth() {
  return fetchJSON("/health");
}

// ── LEGACY ──
export async function getModules() {
  return fetchJSON("/api/modules");
}
export async function getPolicies() {
  return fetchJSON("/api/policies");
}
export async function getEvents() {
  return fetchJSON("/api/events");
}
export async function getSystemStatus() {
  return fetchJSON("/health");
}

// ── RPC proxy ──
export async function ethRPC(method, params = []) {
  const res = await fetch(`${BASE}/api/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// ═════════════════════════════════════════════════════
//  SPEI Payout Endpoints
// ═════════════════════════════════════════════════════

/** Burn CAT on-chain + send MXN via Bitso SPEI */
export async function cobrar({ amount_cat, clabe, recipient_name, concept }) {
  return fetchJSON("/api/cobrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount_cat, clabe, recipient_name, concept }),
  });
}

/** Get current CAT→MXN exchange rate */
export async function getFxQuote(catAmount = 100) {
  return fetchJSON(`/api/fx/quote?cat=${catAmount}`);
}

/** Get wallet balance + Bitso balance */
export async function getBalance() {
  return fetchJSON("/api/balance");
}

/** Get SPEI payout status */
export async function getSpeiStatus(payoutId) {
  return fetchJSON(`/api/spei/status/${payoutId}`);
}

/** Get transaction history */
export async function getTransactions(limit = 50) {
  return fetchJSON(`/api/transactions?limit=${limit}`);
}
