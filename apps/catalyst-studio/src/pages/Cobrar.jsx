import React, { useState, useEffect } from "react";

function Card({ label, value, sub, color = "blue" }) {
  return (
    <div className={`card card-${color}`}>
      <div className="card-label">{label}</div>
      <div className="card-value">{value ?? "..."}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </div>
  );
}

export default function Cobrar() {
  const [fx, setFx] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [form, setForm] = useState({
    amount_cat: "10000",
    clabe: "012290015202390246",
    recipient_name: "Mauricio Rodriguez Tellez",
    concept: "Catalyst Cobro — SPEI",
  });

  const isProduction = health?.app_env === "BASE_MAINNET" || health?.mode === "production";
  const isRealMoney = isProduction && !health?.chain_id === false;

  useEffect(() => {
    fetch("/health").then(r => r.json()).then(setHealth).catch(() => {});
    fetch("/api/fx/quote?cat=100")
      .then((r) => r.json())
      .then(setFx)
      .catch(() => {});
    fetch("/api/balance")
      .then((r) => r.json())
      .then(setBalance)
      .catch(() => {});
    fetch("/api/transactions?limit=10")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .catch(() => {});
  }, []);

  async function handleCobrar(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        // Refresh balance + transactions
        fetch("/api/balance")
          .then((r) => r.json())
          .then(setBalance)
          .catch(() => {});
        fetch("/api/transactions?limit=10")
          .then((r) => r.json())
          .then((d) => setTransactions(d.transactions || []))
          .catch(() => {});
      } else {
        setError(data.error || "Error desconocido");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  return (
    <div className="dashboard">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1>💳 Cobrar — SPEI Payout</h1>
        <span style={{
          fontSize: '0.6rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px',
          background: isRealMoney ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.1)',
          color: isRealMoney ? '#ef4444' : '#f59e0b',
          border: `1px solid ${isRealMoney ? '#ef4444' : '#f59e0b'}33`,
        }}>
          {isRealMoney ? '🔴 DINERO REAL' : '🟡 SANDBOX'}
        </span>
      </div>
      <p className="subtitle">
        {isProduction
          ? `⚡ Base Mainnet (${health?.block?.toLocaleString() || '?'}) — Quema CAT on-chain → SPEI real a BBVA`
          : 'Quema CAT on-chain → Recibe MXN en tu CLABE vía Bitso SPEI'}
      </p>
      {isProduction && (
        <div style={{marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: '0.65rem', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)'}}>
          ⚠️ MODO PRODUCCIÓN — Cada transacción quema CAT real y envía MXN real. Verifica CLABE antes de confirmar.
        </div>
      )}

      {/* FX Rate Cards */}
      {fx && (
        <div className="card-grid">
          <Card
            label="1 CAT → MXN"
            value={`$${fx.oracle.cat_mxn.toFixed(2)} MXN`}
            sub={`Oracle: $${fx.oracle.cat_usd.toFixed(2)} USD`}
            color="green"
          />
          <Card
            label="1 CAT → CNY"
            value={`¥${fx.oracle.cat_cny.toFixed(4)} CNY`}
            sub={`USD/CNY: 7.25`}
            color="blue"
          />
          <Card
            label="Burn 5%"
            value={`${fx.burn_5pct} CAT`}
            sub={`Por cada ${fx.for_amount} CAT`}
            color="orange"
          />
          <Card
            label="Neto"
            value={`${fx.net_cat} CAT`}
            sub={`Después del burn`}
          />
        </div>
      )}

      <div className="split">
        {/* Cobrar Form */}
        <div className="split-left">
          <h2>📤 Nueva Transferencia SPEI</h2>
          <form onSubmit={handleCobrar} className="form-stack">
            <label>
              CAT a quemar:
              <input
                type="number"
                value={form.amount_cat}
                onChange={updateField("amount_cat")}
                min="1"
                required
              />
            </label>
            {fx && (
              <div className="fx-preview">
                ≈ ${(parseFloat(form.amount_cat || 0) * fx.oracle.cat_mxn).toFixed(2)} MXN
                {" / "}
                ${(parseFloat(form.amount_cat || 0) * fx.oracle.cat_usd).toFixed(2)} USD
              </div>
            )}

            <label>
              CLABE destino:
              <input
                type="text"
                value={form.clabe}
                onChange={updateField("clabe")}
                maxLength={18}
                pattern="[0-9]{18}"
                required
              />
            </label>

            <label>
              Nombre del beneficiario:
              <input
                type="text"
                value={form.recipient_name}
                onChange={updateField("recipient_name")}
                required
              />
            </label>

            <label>
              Concepto:
              <input
                type="text"
                value={form.concept}
                onChange={updateField("concept")}
              />
            </label>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "⏳ Procesando..." : "🔥 Quemar CAT + Enviar SPEI"}
            </button>
          </form>

          {error && <div className="alert alert-error">❌ {error}</div>}

          {result && (
            <div className="alert alert-success">
              <h3>✅ ¡COBRO EXITOSO!</h3>
              <div className="tx-details">
                <p>
                  <strong>ID:</strong> {result.transaction.id}
                </p>
                <p>
                  <strong>CAT Quemado:</strong> {result.transaction.amount_cat}{" "}
                  CAT
                </p>
                <p>
                  <strong>MXN Enviado:</strong> $
                  {result.transaction.mxn_amount.toLocaleString()} MXN
                </p>
                <p>
                  <strong>CLABE:</strong> {result.transaction.clabe}
                </p>
                <p>
                  <strong>Bitso Payout:</strong>{" "}
                  {result.transaction.bitso_payout_id}
                </p>
                <p>
                  <strong>SPEI Tracking:</strong>{" "}
                  {result.transaction.spei_tracking}
                </p>
                <p>
                  <strong>Burn TX:</strong>{" "}
                  <code>{result.transaction.burn_tx?.slice(0, 20)}...</code>
                </p>
                <p>
                  <strong>Proof Chain P5:</strong>{" "}
                  <code>{result.transaction.proof_chain?.p5?.slice(0, 20)}...</code>
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className="badge-green">
                    {result.transaction.status}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Balance + History */}
        <div className="split-right">
          {balance && (
            <div className="balance-box">
              <h2>💰 Tesorería</h2>
              <p>
                <strong>Wallet:</strong>{" "}
                <code>{balance.wallet?.slice(0, 12)}...</code>
              </p>
              <div className="card-grid">
                <Card
                  label="CAT"
                  value={parseFloat(balance.tokens.CAT.balance).toLocaleString()}
                  sub={`$${balance.tokens.CAT.value_mxn?.toLocaleString()} MXN`}
                  color="green"
                />
                <Card
                  label="GNC"
                  value={parseFloat(balance.tokens.GNC.balance).toLocaleString()}
                  sub="1:1 CNY backing"
                  color="blue"
                />
                <Card
                  label="CAT Burned"
                  value={parseFloat(balance.tokens.CAT.totalBurned).toLocaleString()}
                  sub={`${((parseFloat(balance.tokens.CAT.totalBurned) / parseFloat(balance.tokens.CAT.totalSupply)) * 100).toFixed(4)}%`}
                  color="orange"
                />
              </div>
            </div>
          )}

          <h2>📋 Últimas Transacciones</h2>
          <div className="event-feed">
            {transactions.length === 0 && (
              <p className="text-muted">Sin transacciones aún</p>
            )}
            {transactions.map((tx) => (
              <div key={tx.id} className={`event-row event-info`}>
                <span className="event-time">
                  {tx.timestamp?.slice(11, 19)}
                </span>
                <span className="event-module">{tx.type}</span>
                <span className="event-type">
                  {tx.amount_cat} CAT → ${tx.mxn_amount?.toLocaleString()} MXN
                </span>
                <span className={`badge-${tx.status === "completed" ? "green" : "yellow"}`}>
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
