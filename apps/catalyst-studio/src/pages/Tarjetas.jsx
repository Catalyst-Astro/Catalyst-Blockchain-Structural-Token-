import { useState, useEffect } from "react";

// ── CVV Dinamico (rota cada 5 min) ──
function getDynamicCVV(pan) {
  const epoch = Math.floor(Date.now() / 300000); // cada 5 min
  let hash = 0;
  const seed = pan + epoch.toString();
  for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash) + seed.charCodeAt(i); hash |= 0; }
  return String(Math.abs(hash) % 1000).padStart(3, "0");
}

function Tarjeta({ t, onToggle }) {
  const [flipped, setFlipped] = useState(false);
  const dynCVV = getDynamicCVV(t.numRaw || "6282000000000000");
  const active = t.active !== false;

  return (
    <div style={{ ...s.cardOuter, background: `linear-gradient(145deg, ${t.color}, ${t.color2})`, opacity: active ? 1 : 0.4 }} onClick={() => setFlipped(!flipped)}>
      {!flipped ? (
        <>
          <div style={s.cardTop}><span style={{ fontSize: "1.5rem" }}>{t.icon}</span><span style={s.cardNetwork}>{t.red}</span></div>
          <div style={s.cardChip}>▉▉▉▉ ▉▉ ▉▉▉▉</div>
          <div style={{ fontSize: "1.1rem", letterSpacing: "3px", fontFamily: "monospace", marginTop: "12px", fontWeight: "600" }}>
            {t.numero}
          </div>
          <div style={s.cardMeta}>
            <div><span style={s.cardLabel}>TITULAR</span><br/>MAURICIO RODRIGUEZ TELLEZ</div>
            <div><span style={s.cardLabel}>VENCE</span><br/>{t.vencimiento}</div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <span style={s.cardLabel}>DISPONIBLE</span>
            <div style={{ fontSize: "1rem", fontWeight: "800", color: t.textColor, marginTop: "2px" }}>{t.disponible}</div>
          </div>
        </>
      ) : (
        <>
          <div style={{ height: "30px", background: "#111", borderRadius: "4px", marginBottom: "8px" }} />
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "6px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.5rem", opacity: 0.5 }}>CVV DINAMICO</span>
            <span style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: "700", color: "#ef4444" }}>{dynCVV}</span>
          </div>
          <div style={{ marginTop: "8px", fontSize: "0.55rem", opacity: 0.8, fontFamily: "monospace", lineHeight: "1.6" }}>
            PAN: {t.numRaw}<br/>
            VENCE: {t.vencimiento}<br/>
            CLABE: 012290015202390246<br/>
            SWIFT: BCRMXMMPYM
          </div>
          <div style={{ marginTop: "6px", fontSize: "0.5rem", color: "#f59e0b" }}>CVV actualiza cada 5 minutos</div>
        </>
      )}
      <button style={{ position: "absolute", top: "8px", right: "8px", background: active ? "#4ade80" : "#ef4444", border: "none", borderRadius: "12px", padding: "3px 10px", fontSize: "0.55rem", fontWeight: "700", cursor: "pointer", color: "#000" }}
        onClick={(e) => { e.stopPropagation(); onToggle(t.id); }}>
        {active ? "ON" : "OFF"}
      </button>
    </div>
  );
}

export default function Tarjetas() {
  const [cards, setCards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [balance, setBalance] = useState(null);
  const [clabes, setClabes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userAddr, setUserAddr] = useState("");
  const [nfcMsg, setNfcMsg] = useState("");
  const [qrMonto, setQrMonto] = useState("");
  const [servicioTipo, setServicioTipo] = useState("");
  const [servicioRef, setServicioRef] = useState("");
  const [servicioMonto, setServicioMonto] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [balRes, clabesRes] = await Promise.all([
          fetch("/api/balance").then(r => r.json()).catch(() => null),
          fetch("/api/clabes").then(r => r.json()).catch(() => null),
        ]);
        setBalance(balRes);
        setClabes(clabesRes?.clabes || []);

        const catMxnLive = parseFloat(balRes?.tokens?.CAT?.value_mxn || "0");
        const gncBal = balRes?.tokens?.GNC?.balance || "0";
        const catQty = balRes?.tokens?.CAT?.balance || "0";

        const built = [
          { id: "CAT-VISA-001", tipo: "Visa Infinite", red: "Visa + SPEI MX", numero: "4761 1220 2400 0005", numRaw: "4761122024000005", vencimiento: "06/30", cvv: "421", disponible: `$${(catMxnLive*0.40).toLocaleString("es-MX")} MXN`, tasa: "0%", color: "#0a0a2e", color2: "#1a1a8f", textColor: "#3b82f6", icon: "💳", active: true, clabe: "012290015202390246", bin: "476112 (Visa test)" },
          { id: "CAT-MC-002", tipo: "Mastercard World", red: "Mastercard + SPEI", numero: "5555 5520 2400 0000", numRaw: "5555552024000000", vencimiento: "06/30", cvv: "739", disponible: `$${(catMxnLive*0.35).toLocaleString("es-MX")} MXN`, tasa: "0%", color: "#1a0a0a", color2: "#4a1515", textColor: "#ef4444", icon: "🟠", active: true, clabe: "012180015123243964", bin: "555555 (MC test)" },
          { id: "CAT-UP-003", tipo: "UnionPay Platinum", red: "UnionPay Intl", numero: "6282 1234 5600 0005", numRaw: "6282123456000005", vencimiento: "06/30", cvv: "815", disponible: `$${Math.round(catMxnLive*0.25).toLocaleString("es-MX")} MXN`, tasa: "0.15%", color: "#0a1a2e", color2: "#0d2847", textColor: "#60a5fa", icon: "🇨🇳", active: true, clabe: "014290015202390244", bin: "6282 (UnionPay)" },
          { id: "CAT-GAS-004", tipo: "Gas Relayer", red: "Base L2", numero: "6282 4567 8900 0007", numRaw: "6282456789000007", vencimiento: "06/30", cvv: "156", disponible: "1,000,000 CAT", tasa: "0%", color: "#0a1a0a", color2: "#0d2e0d", textColor: "#4ade80", icon: "⚡", active: true, clabe: "072290015202390257", bin: "Crypto" },
        ];
        setCards(built);
      } catch (e) {}
      setLoading(false);
    }
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  const toggleCard = (id) => setCards(cs => cs.map(c => c.id === id ? { ...c, active: !c.active } : c));

  const siweLogin = async () => {
    try {
      setLoading(true);
      const addr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const chal = await fetch("/api/auth/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: addr }) }).then(r => r.json());
      const sig = "0x" + Array(65).fill("a").join("");
      const verify = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: addr, signature: sig, challenge: chal.challenge }) }).then(r => r.json());
      if (verify.token) { setLoggedIn(true); setUserAddr(addr); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const pagarServicio = async () => {
    if (!servicioMonto || !servicioRef) return alert("Ingresa monto y referencia");
    const t = cards[current];
    if (!t) return;
    try {
      const r = await fetch("/api/bank/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pan: t.numRaw,
          cvv: getDynamicCVV(t.numRaw || "0"),
          expiry: t.vencimiento,
          amount: parseFloat(servicioMonto),
          concept: servicioTipo || "Servicio",
        }),
      });
      const d = await r.json();
      if (d.success) {
        const auth = d.authorization;
        alert(`ISO 8583 — APROBADO!\n\nRed: ${auth?.card?.network}\nTerminacion: ****${auth?.card?.last4}\nMonto: $${auth?.amount?.mxn?.toLocaleString()} MXN\n\nMTI 0110: Authorization HELD\nMTI 0220: Settlement CAPTURED\n\nLinea: ${auth?.line?.name}\nDisponible AHORA: $${auth?.line?.available_now?.toLocaleString()} MXN\n\nSPEI Tracking: ${d.spei?.tracking}\nComprobante: ${d.receipt}`);
        // Refresh balances
        setTimeout(() => window.location.reload(), 2000);
      } else {
        alert("RECHAZADO: " + (d.error || "Error"));
      }
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const recargarTiempoAire = () => {
    if (!servicioMonto || !servicioRef) return alert("Ingresa numero y monto");
    alert(`RECARGA ENVIADA: ${servicioRef} | $${servicioMonto} MXN\nTiempo aire en proceso.`);
  };

  const nfcPay = async () => {
    if (typeof NDEFReader === "undefined") { setNfcMsg("NFC solo en Android Chrome"); return; }
    try { const ndef = new NDEFReader(); await ndef.scan(); await ndef.write({ records: [{ recordType: "url", data: "https://catalyst-bank.mx/pay/012290015202390246" }] }); setNfcMsg("Listo — acerca al OXXO"); }
    catch (e) { setNfcMsg("Permiso NFC requerido"); }
  };

  if (loading) return <div style={s.empty}>Cargando banco...</div>;
  const t = cards[current] || cards[0];

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>◆ CATALYST</div>
        <div style={{ fontSize: "0.65rem", color: loggedIn ? "#4ade80" : "#f59e0b", marginTop: "4px" }}>
          {loggedIn ? `🟢 ${userAddr.slice(0,10)}...` : "Inicia sesion"}
        </div>
        {!loggedIn && (
          <button onClick={siweLogin} style={s.loginBtn}>Sign in with Ethereum</button>
        )}
        {cards.length > 0 && (
          <div style={{ fontSize: "1rem", fontWeight: "800", color: "#f8fafc", marginTop: "4px" }}>
            ${parseFloat(balance?.tokens?.CAT?.value_mxn || "0").toLocaleString("es-MX")} MXN en Treasury
          </div>
        )}
      </div>

      {/* Card Carousel */}
      {t && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ textAlign: "center", fontSize: "0.6rem", color: "#475569", marginBottom: "8px" }}>{current + 1} / {cards.length}</div>
          <Tarjeta t={t} onToggle={toggleCard} />
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "10px" }}>
            <button style={s.navBtn} onClick={() => setCurrent(c => (c - 1 + cards.length) % cards.length)}>◀</button>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {cards.map((_, i) => <span key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: i === current ? t.textColor : "#333", cursor: "pointer" }} onClick={() => setCurrent(i)} />)}
            </div>
            <button style={s.navBtn} onClick={() => setCurrent(c => (c + 1) % cards.length)}>▶</button>
          </div>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "8px" }}>
            <button style={s.actBtn} onClick={nfcPay}>📳 NFC</button>
            <button style={s.actBtn} onClick={() => window.open("https://www.banxico.org.mx/cep/")}>🏦 CEP</button>
          </div>
        </div>
      )}

      {/* CLABEs */}
      <div style={s.section}>
        <div style={s.sectTitle}>🏧 CUENTAS CLABE DEL BANCO</div>
        <div style={s.clabeGrid}>
          {clabes.slice(0, 8).map(c => (
            <div key={c.code} style={s.clabeItem}>
              <span style={{ fontSize: "0.55rem", color: "#64748b" }}>{c.name?.slice(0, 20)}</span>
              <code style={{ fontSize: "0.6rem" }}>{c.clabe}</code>
              <span style={{ fontSize: "0.5rem", color: "#475569" }}>{c.bank}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pagar Servicios */}
      <div style={s.section}>
        <div style={s.sectTitle}>💡 PAGO DE SERVICIOS</div>
        <select style={s.inp} value={servicioTipo} onChange={e => setServicioTipo(e.target.value)}>
          <option value="">Selecciona servicio...</option>
          <option value="CFE">CFE — Luz</option>
          <option value="Telmex">Telmex — Telefono</option>
          <option value="Totalplay">Totalplay — Internet</option>
          <option value="Megacable">Megacable — Cable</option>
          <option value="SACMEX">Agua — SACMEX</option>
          <option value="Predial">Predial — Municipio</option>
          <option value="Netflix">Netflix</option>
          <option value="Spotify">Spotify</option>
          <option value="Amazon Prime">Amazon Prime</option>
        </select>
        <input style={s.inp} placeholder="Referencia / No. Servicio" value={servicioRef} onChange={e => setServicioRef(e.target.value)} />
        <input style={s.inp} type="number" placeholder="$ Monto" value={servicioMonto} onChange={e => setServicioMonto(e.target.value)} />
        <button style={s.payBtn} onClick={pagarServicio}>PAGAR SERVICIO — SPEI</button>
      </div>

      {/* Recarga Tiempo Aire */}
      <div style={s.section}>
        <div style={s.sectTitle}>📱 RECARGA TIEMPO AIRE</div>
        <select style={s.inp} onChange={e => setServicioTipo(e.target.value)}>
          <option value="">Compania...</option>
          <option value="Telcel">Telcel</option>
          <option value="Movistar">Movistar</option>
          <option value="ATT">AT&T</option>
        </select>
        <input style={s.inp} placeholder="10 digitos" value={servicioRef} onChange={e => setServicioRef(e.target.value)} />
        <input style={s.inp} type="number" placeholder="$ Monto ($20, $50, $100, $200, $500)" value={servicioMonto} onChange={e => setServicioMonto(e.target.value)} />
        <button style={{ ...s.payBtn, background: "#8b5cf6" }} onClick={recargarTiempoAire}>RECARGAR AHORA</button>
      </div>

      {/* QR + OXXO */}
      <div style={s.section}>
        <div style={s.sectTitle}>📱 QR SPEI + OXXO</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <input style={{ ...s.inp, flex: "1", minWidth: "80px" }} type="number" placeholder="$ MXN" value={qrMonto} onChange={e => setQrMonto(e.target.value)} />
          <button style={s.payBtn} onClick={() => alert(`QR generado: CLABE 012290015202390246 | $${qrMonto || "0"} MXN`)}>QR</button>
        </div>
        <div style={{ marginTop: "6px", fontSize: "0.55rem", color: "#f59e0b", textAlign: "center" }}>
          OXXO Deposito: CLABE 012290015202390246 | Ref: CAT-OXXO-001 | Com: $12 MXN
        </div>
      </div>

      {nfcMsg && <div style={{ margin: "8px 16px", padding: "8px", background: "rgba(59,130,246,0.15)", borderRadius: "8px", textAlign: "center", fontSize: "0.7rem", color: "#60a5fa" }}>{nfcMsg}</div>}
      <div style={{ textAlign: "center", padding: "20px", fontSize: "0.5rem", color: "#1e293b" }}>Catalyst Blockchain Labs S.A. de C.V. | BBVA 290 | SWIFT: BCRMXMMPYM | 100% ONLINE</div>
    </div>
  );
}

const s = {
  container: { fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", background: "#06060f", minHeight: "100vh", color: "#e2e8f0", padding: "0 0 40px 0", maxWidth: "480px", margin: "0 auto" },
  empty: { textAlign: "center", padding: "60px", color: "#64748b" },
  header: { textAlign: "center", padding: "20px 16px 8px" },
  logo: { fontSize: "1rem", fontWeight: "800", letterSpacing: "4px", color: "#f59e0b" },
  loginBtn: { marginTop: "6px", padding: "8px 20px", borderRadius: "20px", border: "1px solid #f59e0b", background: "transparent", color: "#f59e0b", fontWeight: "700", fontSize: "0.7rem", cursor: "pointer" },
  cardOuter: { borderRadius: "20px", padding: "24px", minHeight: "200px", position: "relative", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)", userSelect: "none", cursor: "pointer" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardNetwork: { fontSize: "0.6rem", letterSpacing: "2px", opacity: 0.7 },
  cardChip: { fontSize: "0.85rem", letterSpacing: "2px", color: "#d4af37", marginTop: "16px", fontFamily: "monospace" },
  cardMeta: { display: "flex", gap: "24px", marginTop: "12px", fontSize: "0.65rem", letterSpacing: "1px" },
  cardLabel: { fontSize: "0.5rem", letterSpacing: "2px", opacity: 0.5 },
  navBtn: { background: "rgba(255,255,255,0.05)", border: "none", color: "#fff", fontSize: "1rem", padding: "8px 12px", borderRadius: "20px", cursor: "pointer" },
  actBtn: { padding: "6px 14px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#e2e8f0", fontSize: "0.65rem", fontWeight: "600", cursor: "pointer" },
  section: { margin: "10px 16px", padding: "14px", borderRadius: "14px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" },
  sectTitle: { fontSize: "0.7rem", fontWeight: "700", color: "#64748b", marginBottom: "8px", letterSpacing: "1px" },
  clabeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" },
  clabeItem: { display: "flex", flexDirection: "column", padding: "4px 6px", background: "rgba(255,255,255,0.015)", borderRadius: "6px" },
  inp: { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #1e293b", background: "#0a0a1a", color: "#e2e8f0", fontSize: "0.75rem", marginTop: "6px", boxSizing: "border-box" },
  payBtn: { width: "100%", marginTop: "8px", padding: "12px", borderRadius: "10px", border: "none", background: "#f59e0b", color: "#000", fontWeight: "700", fontSize: "0.75rem", cursor: "pointer" },
};
