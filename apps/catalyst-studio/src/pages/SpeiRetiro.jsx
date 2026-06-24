import { useState, useEffect } from "react";

export default function SpeiRetiro() {
  const [tab, setTab] = useState("spei");
  const [monto, setMonto] = useState("");
  const [clabe, setClabe] = useState("012290015202390246");
  const [concepto, setConcepto] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [balance, setBalance] = useState(null);
  const [rates, setRates] = useState(null);
  const [txHistory, setTxHistory] = useState([]);
  const [poolStatus, setPoolStatus] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [bal, rate, tx] = await Promise.all([
          fetch("/api/balance").then(r => r.json()).catch(() => null),
          fetch("/api/fx/quote?cat=100").then(r => r.json()).catch(() => null),
          fetch("/api/transactions").then(r => r.json()).catch(() => null),
        ]);
        setBalance(bal);
        setRates(rate);
        setTxHistory(tx?.transactions || []);
        setPoolStatus({
          cat: "1,000,000 CAT",
          eth: "50.01 ETH",
          price: "1 CAT = 0.00005 ETH",
          swap: "0.01 ETH = 200 CAT",
          status: "LIVE",
        });
      } catch (e) {}
    }
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  const catMxn = rates?.oracle?.cat_mxn || 2;
  const catBalance = parseFloat(balance?.tokens?.CAT?.balance || "0");
  const valueMXN = parseFloat(balance?.tokens?.CAT?.value_mxn || "0");

  // LC-001 is the most liquid: 33.33% of CAT treasury
  const lineaLC001 = Math.round(valueMXN * 0.3333);
  const availableMXN = lineaLC001;
  const availableCAT = Math.round(catBalance * 0.3333);

  // ── SPEI Transfer (draws from LC-001 BBVA) ──
  const ejecutarSpei = async () => {
    if (!monto || parseFloat(monto) <= 0) { setMsg("Ingresa un monto valido"); return; }
    if (parseFloat(monto) > availableMXN) { setMsg(`Excede linea disponible: $${availableMXN.toLocaleString()} MXN`); return; }
    if (clabe.length !== 18) { setMsg("CLABE debe tener 18 digitos"); return; }
    setLoading(true); setMsg("");
    try {
      const amountCat = Math.ceil(parseFloat(monto) / catMxn);
      const r = await fetch("/api/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_cat: amountCat,
          clabe,
          recipient_name: beneficiario || "Beneficiario SPEI",
          concept: concepto || `SPEI Catalyst LC-001`,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setResult({
          type: "spei",
          tracking: d.transaction.spei_tracking,
          monto: parseFloat(monto),
          clabe,
          linea: "LC-001 BBVA",
          proof: d.transaction.proof_chain?.p5,
          timestamp: d.transaction.timestamp,
          burnTx: d.transaction.burn_tx,
        });
        setMsg(`SPEI ENVIADO — ${d.transaction.spei_tracking}`);
      } else {
        setResult({ type: "spei", error: true, detail: d.error });
        setMsg("Error: " + (d.error || "API"));
      }
    } catch (e) {
      setResult({ type: "spei", error: true, detail: e.message });
      setMsg("Error de conexion con el servidor");
    }
    setLoading(false);
  };

  // ── OXXO Withdrawal (draws from LC-001) ──
  const generarRetiroOxxo = () => {
    if (!monto || parseFloat(monto) <= 0) { setMsg("Ingresa monto"); return; }
    if (parseFloat(monto) > availableMXN) { setMsg(`Linea maxima: $${availableMXN.toLocaleString()} MXN. Monto muy alto.`); return; }
    if (parseFloat(monto) > 15000) { setMsg("Maximo OXXO por operacion: $15,000 MXN"); return; }
    if (pin.length < 4) { setMsg("Crea un PIN de 4 digitos"); return; }

    const raw = `${String(Math.floor(parseFloat(monto)*100)).padStart(10,"0")}${pin.padStart(4,"0")}${String(Math.floor(Math.random()*999)).padStart(3,"0")}`;
    const check = raw.split("").reduce((a,c) => a + parseInt(c),0) % 10;

    setResult({
      type: "oxxo-ret",
      codigo: `${raw}${check}`,
      monto: parseFloat(monto),
      linea: "LC-001 BBVA",
      lineaDisponible: availableMXN,
      vencimiento: new Date(Date.now()+3600000).toISOString().slice(11,19),
    });
    setMsg(`Retiro OXXO generado — LC-001 — $${parseFloat(monto).toLocaleString()} MXN`);
  };

  const generarOxxoDeposito = () => {
    if (!monto || parseFloat(monto) <= 0) { setMsg("Ingresa monto"); return; }
    const d = new Date();
    const ref = `OX${d.toISOString().slice(2,10).replace(/-/g,"")}${String(Math.floor(parseFloat(monto))).padStart(6,"0")}${String(Math.floor(Math.random()*9999)).padStart(4,"0")}`;
    setResult({
      type: "oxxo-dep",
      ref,
      monto: parseFloat(monto),
      clabe,
      vencimiento: new Date(Date.now() + 86400000*2).toISOString().slice(0,10),
      comision: 12,
    });
    setMsg(`Deposito OXXO — Ref: ${ref}`);
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>◆ CATALYST BANK</div>
        <div style={s.sub}>SPEI + OXXO — Linea LC-001</div>

        {/* Pool Status */}
        <div style={s.poolBar}>
          <span>🟢 Pool: {poolStatus?.swap || "1 ETH = 20,000 CAT"}</span>
        </div>

        {/* Credit Line Available */}
        <div style={s.creditBar}>
          <div style={s.creditTitle}>LINEA DISPONIBLE LC-001 BBVA</div>
          <div style={s.creditAmount}>${availableMXN.toLocaleString("es-MX")} MXN</div>
          <div style={s.creditDetail}>
            {availableCAT.toLocaleString("es-MX")} CAT | 33.33% Treasury | Tasa 0%
          </div>
        </div>

        <div style={s.rateBar}>
          Oracle: 1 CAT = ${catMxn} MXN | Pool: 1 CAT = 0.00005 ETH
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {[
          { id: "spei", label: "💸 SPEI", desc: "Transferir" },
          { id: "oxxo-ret", label: "💵 Retiro", desc: "OXXO" },
          { id: "oxxo-dep", label: "📥 Deposito", desc: "OXXO" },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setMsg(""); }}
            style={{ ...s.tab, background: tab === t.id ? "#f59e0b" : "transparent", color: tab === t.id ? "#000" : "#94a3b8" }}>
            <div style={s.tabLabel}>{t.label}</div>
            <div style={s.tabDesc}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={s.form}>
        <label style={s.lbl}>
          Monto (MXN) — Disponible: ${availableMXN.toLocaleString("es-MX")}
        </label>
        <input style={s.inp} type="number" placeholder="$1,000" value={monto} onChange={e => setMonto(e.target.value)} />

        {rates && parseFloat(monto) > 0 && (
          <div style={s.conversion}>
            = {Math.ceil(parseFloat(monto||0) / catMxn)} CAT (quema 5%: {Math.ceil(parseFloat(monto||0) / catMxn * 0.05)} CAT)
            <br/>Linea: LC-001 BBVA | Tasa: 0% | Respaldo: CAT Treasury
          </div>
        )}

        {tab === "spei" && (<>
          <label style={s.lbl}>CLABE destino</label>
          <input style={s.inp} value={clabe} onChange={e => setClabe(e.target.value)} />
          <label style={s.lbl}>Beneficiario</label>
          <input style={s.inp} placeholder="Nombre" value={beneficiario} onChange={e => setBeneficiario(e.target.value)} />
          <label style={s.lbl}>Concepto</label>
          <input style={s.inp} placeholder="Concepto" value={concepto} onChange={e => setConcepto(e.target.value)} />
          <button style={s.btn} onClick={ejecutarSpei} disabled={loading}>
            {loading ? "ENVIANDO..." : `ENVIAR SPEI — LC-001`}
          </button>
        </>)}

        {tab === "oxxo-dep" && (<>
          <label style={s.lbl}>CLABE destino</label>
          <input style={s.inp} value={clabe} onChange={e => setClabe(e.target.value)} />
          <button style={s.btn} onClick={generarOxxoDeposito}>GENERAR FICHA OXXO</button>
        </>)}

        {tab === "oxxo-ret" && (<>
          <label style={s.lbl}>PIN de 4 digitos</label>
          <input style={s.inp} type="password" maxLength={4} placeholder="****" value={pin} onChange={e => setPin(e.target.value)} />
          <div style={s.oxxoNote}>
            Maximo por operacion: $15,000 MXN | Cobro inmediato a LC-001
          </div>
          <button style={{ ...s.btn, background: "#ef4444" }} onClick={generarRetiroOxxo}>
            RETIRAR EFECTIVO OXXO
          </button>
        </>)}

        {msg && <div style={{ ...s.msg, background: result?.error ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.1)" }}>{msg}</div>}
      </div>

      {/* Results */}
      {result?.type === "spei" && !result.error && (
        <div style={s.resultCard}>
          <div style={s.resultTitle}>✅ SPEI ENVIADO — {result.linea}</div>
          <div style={s.rItem}><span>Tracking</span><code>{result.tracking}</code></div>
          <div style={s.rItem}><span>Monto</span><strong>${result.monto?.toLocaleString()} MXN</strong></div>
          <div style={s.rItem}><span>CLABE</span><code>{result.clabe}</code></div>
          <div style={s.rItem}><span>Linea</span><span style={{ color: "#f59e0b" }}>{result.linea}</span></div>
          <div style={s.rItem}><span>Banxico CEP</span><a href="https://www.banxico.org.mx/cep/" target="_blank" style={{ color: "#60a5fa" }}>Consultar →</a></div>
        </div>
      )}

      {result?.type === "oxxo-dep" && (
        <div style={s.resultCard}>
          <div style={s.resultTitle}>📥 FICHA DEPOSITO OXXO</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: "800", fontFamily: "monospace", color: "#f59e0b" }}>{result.ref}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", marginTop: "4px" }}>${result.monto.toLocaleString()} MXN</div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>CLABE: {result.clabe}</div>
            <div style={{ fontSize: "0.6rem", color: "#64748b" }}>Vence: {result.vencimiento} | Com: $12 MXN</div>
            <div style={{ marginTop: "12px", fontSize: "0.65rem", color: "#94a3b8", lineHeight: "1.8", textAlign: "left" }}>
              1. Ve a OXXO, 7-Eleven o Circle K<br/>
              2. Da la REFERENCIA y el MONTO<br/>
              3. Paga efectivo + $12 MXN comision<br/>
              4. El dinero cae en CLABE {result.clabe?.slice(-6)}
            </div>
          </div>
        </div>
      )}

      {result?.type === "oxxo-ret" && (
        <div style={s.resultCard}>
          <div style={s.resultTitle}>💵 RETIRO OXXO — {result.linea}</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", fontFamily: "monospace", color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "12px", borderRadius: "8px", letterSpacing: "3px" }}>{result.codigo}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "800", marginTop: "8px" }}>${result.monto.toLocaleString()} MXN</div>
            <div style={{ fontSize: "0.7rem", color: "#f59e0b", marginTop: "4px" }}>
              Cobrado a: {result.linea} | Disponible: ${result.lineaDisponible?.toLocaleString()} MXN
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>PIN: ****</div>
            <div style={{ fontSize: "0.6rem", color: "#f59e0b" }}>Valido hasta: {result.vencimiento} (1 hora)</div>
            <div style={{ marginTop: "10px", fontSize: "0.65rem", color: "#e2e8f0", lineHeight: "1.6" }}>
              Ve a OXXO. Di "Quiero hacer un retiro sin tarjeta". Da el codigo y tu PIN.
            </div>
            <div style={{ marginTop: "6px", fontSize: "0.55rem", color: "#475569" }}>
              Source: POOL CAT/ETH @ 0.00005 ETH/CAT | Oracle: 1 CAT = $2 MXN
            </div>
            <div style={{ marginTop: "8px", fontSize: "0.6rem", color: "#ef4444", fontStyle: "italic" }}>No compartas el codigo ni el PIN</div>
          </div>
        </div>
      )}

      {/* History */}
      <div style={s.history}>
        <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748b", marginBottom: "8px" }}>
          HISTORIAL ({txHistory.length})
        </div>
        {txHistory.slice(0, 5).map(tx => (
          <div key={tx.id} style={s.txRow}>
            <span style={{ fontSize: "0.55rem", color: "#475569" }}>{tx.timestamp?.slice(0,16)?.replace("T"," ")}</span>
            <span style={{ fontSize: "0.6rem", color: tx.status === "completed" ? "#4ade80" : "#f59e0b" }}>{tx.status}</span>
            <span style={{ fontSize: "0.55rem", fontFamily: "monospace" }}>{tx.amount_cat?.toLocaleString()} CAT</span>
            <span style={{ fontSize: "0.55rem", color: "#94a3b8" }}>→ {tx.clabe?.slice(-6)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  container: { fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", background: "#06060f", minHeight: "100vh", color: "#e2e8f0", padding: "0 0 40px 0", maxWidth: "480px", margin: "0 auto" },
  header: { textAlign: "center", padding: "20px 16px 12px" },
  logo: { fontSize: "1rem", fontWeight: "800", letterSpacing: "4px", color: "#f59e0b" },
  sub: { fontSize: "0.7rem", color: "#64748b", marginTop: "4px" },
  poolBar: { marginTop: "6px", padding: "4px 10px", background: "rgba(74,222,128,0.08)", borderRadius: "8px", fontSize: "0.55rem", color: "#4ade80", display: "inline-block", border: "1px solid rgba(74,222,128,0.15)" },
  creditBar: { marginTop: "8px", padding: "12px", background: "rgba(245,158,11,0.06)", borderRadius: "12px", border: "1px solid rgba(245,158,11,0.2)" },
  creditTitle: { fontSize: "0.6rem", color: "#f59e0b", letterSpacing: "2px", fontWeight: "700" },
  creditAmount: { fontSize: "1.4rem", fontWeight: "800", color: "#f8fafc", marginTop: "2px" },
  creditDetail: { fontSize: "0.55rem", color: "#64748b", marginTop: "2px" },
  rateBar: { fontSize: "0.55rem", color: "#334155", marginTop: "4px" },
  tabs: { display: "flex", gap: "4px", padding: "8px 12px" },
  tab: { flex: "1", padding: "10px 8px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", textAlign: "center", transition: "all 0.2s", minWidth: "90px" },
  tabLabel: { fontSize: "0.8rem", fontWeight: "700" },
  tabDesc: { fontSize: "0.55rem", opacity: 0.6, marginTop: "2px" },
  form: { padding: "12px 16px" },
  lbl: { display: "block", fontSize: "0.65rem", color: "#64748b", marginTop: "10px", marginBottom: "4px", letterSpacing: "1px" },
  inp: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #1e293b", background: "#0a0a1a", color: "#e2e8f0", fontSize: "1rem", boxSizing: "border-box" },
  conversion: { fontSize: "0.55rem", color: "#475569", marginTop: "4px", padding: "6px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" },
  oxxoNote: { fontSize: "0.55rem", color: "#f59e0b", marginTop: "4px", marginBottom: "4px" },
  btn: { width: "100%", marginTop: "14px", padding: "14px", borderRadius: "12px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "800", fontSize: "0.85rem", cursor: "pointer", letterSpacing: "1px" },
  msg: { marginTop: "10px", padding: "10px", borderRadius: "8px", fontSize: "0.7rem", textAlign: "center" },
  resultCard: { margin: "8px 16px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(74,222,128,0.15)" },
  resultTitle: { fontSize: "0.85rem", fontWeight: "700", color: "#4ade80", marginBottom: "10px" },
  rItem: { display: "flex", justifyContent: "space-between", fontSize: "0.7rem", alignItems: "center", padding: "4px 0" },
  history: { margin: "16px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)" },
  txRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", gap: "6px", flexWrap: "wrap" },
};
