import { useState, useEffect } from "react";

export default function Cheques() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/checks");
        const d = await r.json();
        if (d.success) setData(d);
      } catch(e) {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={s.empty}>Cargando cheques certificados...</div>;
  if (!data) return <div style={s.empty}>Chequera no encontrada</div>;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.logo}>✈ PAN AM CHECKS</div>
        <div style={s.sub}>UTF-38 Certified Bearer — Catch Me If You Can</div>
        <div style={{marginTop: 4, fontSize: '0.5rem', color: '#f59e0b'}}>⚡ Base Mainnet · SHA-256 Proof Chain · 38-bit Cipher</div>
        <div style={s.badge}>
          {data.todos_integros ? "✅ TODOS INTEGROS" : "⚠ REVISAR"}
        </div>
      </div>

      <div style={s.summary}>
        <span>${data.cheques?.reduce((a,c) => a + (c.monto_mxn||0), 0).toLocaleString("es-MX")} MXN</span>
        <span>{data.total_cheques} cheques</span>
        <span>UTF-38 + SHA-256</span>
      </div>

      {data.cheques?.map((c, i) => (
        <div key={i} style={{...s.check, borderLeftColor: i % 2 === 0 ? "#f59e0b" : "#3b82f6"}}
          onClick={() => setSelected(selected === i ? null : i)}>
          <div style={s.checkHeader}>
            <span style={s.checkId}>{c.check_id}</span>
            <span style={s.checkAmount}>${c.monto_mxn?.toLocaleString("es-MX")} MXN</span>
          </div>
          <div style={s.checkInfo}>
            <span>{c.beneficiario}</span>
            <span style={{color:"#64748b",fontSize:"0.55rem"}}>{c.ubicacion}</span>
          </div>
          <div style={s.checkVcode}>
            <code>{c.utf38_protection?.verification_code}</code>
            <span style={{fontSize:"0.5rem",color:"#475569"}}>{c.utf38_protection?.["38bit_blocks"]} bloques UTF-38</span>
          </div>

          {selected === i && (
            <div style={s.detail}>
              <div style={s.detailTitle}>PROOF CHAIN SHA-256</div>
              <code style={s.code}>
                L1: {c.utf38_protection?.proof_chain?.p1?.slice(0,32)}<br/>
                L2: {c.utf38_protection?.proof_chain?.p2?.slice(0,32)}<br/>
                L3: {c.utf38_protection?.proof_chain?.p3?.slice(0,32)}<br/>
                L4: {c.utf38_protection?.proof_chain?.p4?.slice(0,32)}<br/>
                L5: {c.utf38_protection?.proof_chain?.p5?.slice(0,32)}
              </code>
              <div style={{marginTop:"8px"}}>
                <span style={{color:c.integrity_verified ? "#4ade80" : "#ef4444",fontSize:"0.65rem"}}>
                  {c.integrity_verified ? "✅ INTEGRO" : "❌ ALTERADO"}
                </span>
              </div>
              <div style={s.qrData}>QR: {c.qrcode_data?.slice(0,60)}</div>
            </div>
          )}
        </div>
      ))}

      <div style={s.cert}>
        <div style={s.certTitle}>PROTECCION UTF-38</div>
        <p style={{fontSize:"0.6rem",color:"#64748b",lineHeight:"1.8"}}>
          Cada cheque esta cifrado con UTF-38 block cipher (38-bit blocks, XOR + 19-bit rotation).
          La proof chain SHA-256 de 5 capas garantiza integridad criptografica.
          Cualquier alteracion en el ciphertext rompe la cadena de verificacion.
          Cobrable en OXXO, 7-Eleven, Circle K, BBVA, Santander, HSBC y cualquier banco.
        </p>
      </div>
    </div>
  );
}

const s = {
  container: { fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", background: "#06060f", minHeight: "100vh", color: "#e2e8f0", padding: "0 0 40px 0", maxWidth: "480px", margin: "0 auto" },
  empty: { textAlign: "center", padding: "60px", color: "#64748b" },
  header: { textAlign: "center", padding: "24px 16px 8px" },
  logo: { fontSize: "1.2rem", fontWeight: "800", color: "#f59e0b", letterSpacing: "3px" },
  sub: { fontSize: "0.6rem", color: "#64748b", marginTop: "4px" },
  badge: { marginTop: "6px", display: "inline-block", padding: "4px 12px", borderRadius: "12px", fontSize: "0.6rem", background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" },
  summary: { display: "flex", justifyContent: "space-around", padding: "12px", margin: "8px 16px", background: "rgba(245,158,11,0.05)", borderRadius: "12px", fontSize: "0.65rem", border: "1px solid rgba(245,158,11,0.1)" },
  check: { margin: "6px 16px", padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderLeft: "3px solid #f59e0b", cursor: "pointer" },
  checkHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  checkId: { fontFamily: "monospace", fontSize: "0.7rem", fontWeight: "600" },
  checkAmount: { fontSize: "0.85rem", fontWeight: "800", color: "#f59e0b" },
  checkInfo: { display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.6rem" },
  checkVcode: { display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.55rem", fontFamily: "monospace", color: "#4ade80" },
  detail: { marginTop: "10px", padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: "8px" },
  detailTitle: { fontSize: "0.6rem", fontWeight: "700", color: "#64748b", marginBottom: "6px" },
  code: { fontSize: "0.5rem", color: "#94a3b8", lineHeight: "1.6" },
  qrData: { marginTop: "6px", fontSize: "0.5rem", color: "#475569", fontFamily: "monospace", wordBreak: "break-all" },
  cert: { margin: "16px", padding: "16px", borderRadius: "16px", background: "rgba(245,158,11,0.02)", border: "1px solid rgba(245,158,11,0.08)" },
  certTitle: { fontSize: "0.7rem", fontWeight: "700", color: "#f59e0b", marginBottom: "8px" },
};
