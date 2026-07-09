// =============================================================================
// Bitso Business API Client — SPEI Payout Integration
// =============================================================================
// Docs: https://business.bitso.com/docs
// Sandbox test CLABE: 014027000005555558
// =============================================================================

const crypto = require("crypto");

class BitsoBusinessClient {
  constructor({ apiKey, apiSecret, sandbox = true }) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.sandbox = sandbox;
    this.baseURL = sandbox
      ? "https://api.sandbox.bitso.com/v3"
      : "https://api.bitso.com/v3";
  }

  // ── HMAC-SHA256 Request Signing ──
  _sign(method, path, body = "") {
    const nonce = Date.now().toString();
    const message = `${nonce}${method}${path}${body}`;
    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(message)
      .digest("hex");
    return { nonce, signature };
  }

  async _request(method, path, body = null) {
    const url = `${this.baseURL}${path}`;
    const bodyStr = body ? JSON.stringify(body) : "";
    const { nonce, signature } = this._sign(method, path, bodyStr);

    const headers = {
      Authorization: `Bitso ${this.apiKey}:${nonce}:${signature}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr || undefined,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `Bitso API ${res.status}: ${data.message || JSON.stringify(data)}`
      );
    }
    return data;
  }

  // ── FX ──

  /** Get FX quote for USD→MXN or crypto→MXN */
  async getFxQuote(amount, from = "usd", to = "mxn") {
    return this._request("POST", "/fx", {
      from_currency: from,
      to_currency: to,
      amount: amount.toString(),
    });
  }

  // ── PAYOUTS (SPEI) ──

  /**
   * Send MXN to a Mexican bank account via SPEI.
   * @param {Object} params
   * @param {string} params.amount_mxn - Amount in MXN
   * @param {string} params.clabe - 18-digit CLABE
   * @param {string} params.recipient_name - Full name of recipient
   * @param {string} [params.concept] - Payment reference/concept
   * @param {string} [params.internal_ref] - Your internal reference for reconciliation
   */
  async createSpeiPayout({
    amount_mxn,
    clabe,
    recipient_name,
    concept = "Catalyst Payout",
    internal_ref,
  }) {
    // Validate CLABE
    if (!this._validateClabe(clabe)) {
      throw new Error(`CLABE inválida: ${clabe}`);
    }

    const payload = {
      amount: amount_mxn.toString(),
      currency: "mxn",
      payment_method: "spei",
      beneficiary: {
        clabe,
        family_names: recipient_name.split(" ").slice(1).join(" "),
        given_names: recipient_name.split(" ")[0],
      },
      description: concept,
    };

    if (internal_ref) payload.internal_reference = internal_ref;

    return this._request("POST", "/payouts", payload);
  }

  /** Get payout status by ID */
  async getPayoutStatus(payoutId) {
    return this._request("GET", `/payouts/${payoutId}`);
  }

  // ── BALANCE ──

  /** Get account balances */
  async getBalances() {
    return this._request("GET", "/balance");
  }

  // ── WEBHOOKS ──

  /** Verify webhook signature */
  verifyWebhook(payload, signature) {
    const expected = crypto
      .createHmac("sha256", this.apiSecret)
      .update(JSON.stringify(payload))
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  // ── CLABE Validation (Módulo 10) ──
  _validateClabe(clabe) {
    if (!/^\d{18}$/.test(clabe)) return false;
    const pesos = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
    let suma = 0;
    for (let i = 0; i < 17; i++) {
      suma += parseInt(clabe[i]) * pesos[i];
    }
    const mod = suma % 10;
    const dv = mod === 0 ? 0 : 10 - mod;
    return dv === parseInt(clabe[17]);
  }
}

// ── Sandbox client for development (no real API keys needed) ──
class BitsoSandboxClient extends BitsoBusinessClient {
  constructor() {
    super({ apiKey: "sandbox", apiSecret: "sandbox", sandbox: true });
    this._payouts = [];
    this._balances = { mxn: "1000000.00", usd: "50000.00", usdc: "100000.00" };
  }

  async _request(method, path, body = null) {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    // Simulate FX quote
    if (path === "/fx" && method === "POST") {
      const rate = 19.80 + Math.random() * 0.40; // ~19.80-20.20 MXN/USD
      return {
        success: true,
        payload: {
          from_currency: body.from_currency,
          to_currency: body.to_currency,
          from_amount: body.amount,
          to_amount: (parseFloat(body.amount) * rate).toFixed(2),
          rate: rate.toFixed(4),
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Simulate payout creation
    if (path === "/payouts" && method === "POST") {
      const payoutId = `spei_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const payout = {
        success: true,
        payload: {
          id: payoutId,
          status: "completed",
          amount: body.amount,
          currency: body.currency,
          payment_method: "spei",
          beneficiary: body.beneficiary,
          description: body.description,
          spei_tracking_key: `${Date.now()}`,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      };
      this._payouts.push(payout);
      return payout;
    }

    // Simulate balance
    if (path === "/balance" && method === "GET") {
      return {
        success: true,
        payload: { balances: this._balances },
      };
    }

    throw new Error(`Sandbox: endpoint no simulado ${method} ${path}`);
  }

  // Override: direct CLABE validation without API
  async createSpeiPayout(params) {
    if (!this._validateClabe(params.clabe)) {
      throw new Error(`CLABE inválida: ${params.clabe}`);
    }
    return this._request("POST", "/payouts", params);
  }
}

module.exports = { BitsoBusinessClient, BitsoSandboxClient };
