import { useState, useEffect } from "react";

export default function Buzon() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/buzon" + (filter ? `?autoridad=${filter}` : ""));
        const d = await r.json();
        if (d.success) setData(d);
      } catch (e) {}
      setLoading(false);
    }
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [filter]);

  if (loading) return <div style={s.empty}>Cargando buzon...</div>;

  const autoridades = data?.autoridades || [];
  const AUTH_ICONS = { banxico: "🏦", cnbv: "📊", uif: "🔍", sat: "💰", bbva: "🏧", bitso: "💱", unionpay: "🇨🇳" };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.logo}>📬 BUZON REGULATORIO</div>
        <div style={s.sub}>Catalyst Bank — CNBV · Banxico · SAT · UIF · BBVA · Bitso · UnionPay</div>
        <div style={{marginTop: 8, fontSize: '0.55rem', color: '#f59e0b', background: 'rgba(245,158,11,0.06)', padding: '3px 10px', borderRadius: 8, display: 'inline-block'}}>
          📡 Despacho: Lun-Vie 09:00 | Verificación: SHA-256 | Blockchain: Base L2
        </div>
      </div>

      {/* Status */}
      <div style={s.statusBar}>
        <div style={s.stat}><span>📤</span><strong>{data?.outbox_total || 0}</strong> Enviados</div>
        <div style={s.stat}><span>📥</span><strong>{data?.inbox_total || 0}</strong> Recibidos</div>
        <div style={s.stat}><span>⏳</span><strong>{data?.pendientes || 0}</strong> Pendientes</div>
        <div style={s.stat}><span>✅</span><strong>{data?.confirmados || 0}</strong> Confirmados</div>
      </div>

      {/* Filter */}
      <div style={s.filterBar}>
        <button style={{ ...s.filterBtn, background: !filter ? "#f59e0b" : "transparent", color: !filter ? "#000" : "#94a3b8" }} onClick={() => setFilter("")}>TODOS</button>
        {autoridades.map(a => (
          <button key={a} style={{ ...s.filterBtn, background: filter === a ? "#f59e0b" : "transparent", color: filter === a ? "#000" : "#94a3b8" }} onClick={() => setFilter(filter === a ? "" : a)}>
            {AUTH_ICONS[a] || ""} {a.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Outbox */}
      <div style={s.section}>
        <div style={s.sectionTitle}>📤 ENVIADOS ({data?.outbox?.length || 0})</div>
        {(data?.outbox || []).slice().reverse().map(m => (
          <div key={m.id} style={{ ...s.msg, borderLeftColor: m.acknowledged ? "#4ade80" : "#f59e0b" }}>
            <div style={s.msgHeader}>
              <span>{AUTH_ICONS[m.to] || "📧"} {m.to_name || m.to}</span>
              <span style={{ color: m.acknowledged ? "#4ade80" : "#f59e0b", fontSize: "0.6rem" }}>
                {m.acknowledged ? "CONFIRMADO" : "PENDIENTE"}
              </span>
            </div>
            <div style={s.msgSubject}>{m.subject}</div>
            <div style={s.msgBody}>{m.body?.slice(0, 180)}...</div>
            <div style={s.msgFooter}>
              <span>{m.timestamp?.slice(0,16)?.replace("T"," ")}</span>
              <code style={{ fontSize: "0.5rem" }}>{m.seal?.slice(0,16)}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Inbox */}
      <div style={s.section}>
        <div style={s.sectionTitle}>📥 RECIBIDOS ({data?.inbox?.length || 0})</div>
        {data?.inbox?.length === 0 && (
          <div style={s.emptyMsg}>Sin respuestas aun. Las autoridades suelen responder en 24-48h habiles.</div>
        )}
        {(data?.inbox || []).slice().reverse().map(m => (
          <div key={m.id} style={{ ...s.msg, borderLeftColor: "#60a5fa" }}>
            <div style={s.msgHeader}>
              <span>{AUTH_ICONS[m.from] || "📧"} {m.from_name || m.from}</span>
              <span style={{ color: "#60a5fa", fontSize: "0.6rem" }}>RECIBIDO</span>
            </div>
            <div style={s.msgBody}>{m.body?.slice(0, 200)}</div>
            <div style={s.msgFooter}>
              <span>{m.timestamp?.slice(0,16)?.replace("T"," ")}</span>
              <code style={{ fontSize: "0.5rem" }}>{m.seal?.slice(0,16)}</code>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Log */}
      <div style={s.section}>
        <div style={s.sectionTitle}>📋 BITACORA DIARIA</div>
        {(data?.daily_log || []).slice().reverse().slice(0, 15).map((l, i) => (
          <div key={i} style={s.logItem}>
            <span style={{ color: "#475569", fontSize: "0.55rem" }}>{l.date} {l.time?.slice(0,8)}</span>
            <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>{l.action}</span>
            <code style={{ fontSize: "0.5rem", color: "#1e293b" }}>{l.seal}</code>
          </div>
        ))}
      </div>

      <div style={s.footer}>
        Proximo despacho: mañana 09:00 AM | 7 autoridades | 7 reportes diarios
      </div>
    </div>
  );
}

const s = {
  container: { fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", background: "#06060f", minHeight: "100vh", color: "#e2e8f0", padding: "0 0 40px 0", maxWidth: "480px", margin: "0 auto" },
  empty: { textAlign: "center", padding: "60px", color: "#64748b" },
  header: { textAlign: "center", padding: "24px 16px 12px" },
  logo: { fontSize: "1.1rem", fontWeight: "800", letterSpacing: "3px", color: "#f59e0b" },
  sub: { fontSize: "0.65rem", color: "#64748b", marginTop: "4px" },
  statusBar: { display: "flex", gap: "6px", padding: "8px 12px", flexWrap: "wrap", justifyContent: "center" },
  stat: { background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "10px", fontSize: "0.6rem", display: "flex", alignItems: "center", gap: "4px", border: "1px solid rgba(255,255,255,0.05)" },
  filterBar: { display: "flex", gap: "4px", padding: "8px 12px", flexWrap: "wrap" },
  filterBtn: { padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.6rem", cursor: "pointer", background: "transparent", fontWeight: "600" },
  section: { margin: "8px 12px" },
  sectionTitle: { fontSize: "0.7rem", fontWeight: "700", color: "#64748b", marginBottom: "6px", letterSpacing: "1px" },
  msg: { background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "10px", marginBottom: "6px", border: "1px solid rgba(255,255,255,0.04)", borderLeft: "3px solid #f59e0b" },
  msgHeader: { display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: "600", marginBottom: "4px" },
  msgSubject: { fontSize: "0.65rem", fontWeight: "600", color: "#e2e8f0", marginBottom: "2px" },
  msgBody: { fontSize: "0.6rem", color: "#64748b", lineHeight: "1.5" },
  msgFooter: { display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.55rem", color: "#475569" },
  emptyMsg: { textAlign: "center", padding: "16px", color: "#475569", fontSize: "0.65rem", fontStyle: "italic" },
  logItem: { display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.02)", alignItems: "center", gap: "4px", flexWrap: "wrap" },
  footer: { textAlign: "center", padding: "16px", fontSize: "0.55rem", color: "#1e293b" },
};
