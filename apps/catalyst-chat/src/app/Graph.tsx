"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ─── Grafo hermenéutico Zettelkasten (estilo Obsidian) ─────────────────
// Fuerza dirigida en canvas: nodos = chats (color por carpeta) + conceptos.
// Aristas: chat↔concepto y chat↔chat (peso = conceptos compartidos).

export type GraphChat = {
  id: string;
  title: string;
  folder: string;
  summary?: string;
  concepts?: string[];
};
export type GraphLink = {
  source: string;
  target: string;
  shared: string[];
  weight: number;
};
export type GraphNote = {
  id: string;
  concept: string;
  title: string;
  content: string;
  sources: string[];
};
type Evolution = {
  narrative: string;
  contradictions: string[];
  timeline: { id: string; title: string; date: string | number }[];
};

type Node = {
  id: string;
  label: string;
  kind: "chat" | "concept" | "note";
  folder?: string;
  x: number; y: number; vx: number; vy: number;
  r: number;
};
type Edge = { a: number; b: number; w: number; kind: "cc" | "kc" | "nc" };

const FONT = "'Times New Roman', Times, serif";
const C = {
  bg: "#f4f4f0", surface: "#fff", text: "#1a1a1a",
  muted: "#8b8b82", subtle: "#b4b4ac", border: "#d4d4cc",
  accent: "#00a85a", red: "#d4442c", amber: "#d4902c",
  gold: "#b8860b", goldBg: "rgba(184,134,11,0.08)",
};
// Paleta Swiss para carpetas
const FOLDER_COLORS = ["#00a85a", "#d4442c", "#d4902c", "#4a7ab5", "#8a5ab5", "#2d2d2d", "#b83820", "#3a8a8a"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Graph({
  chats,
  links,
  onOpen,
}: {
  chats: GraphChat[];
  links: GraphLink[];
  onOpen: (chatId: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string>("");
  const [showConcepts, setShowConcepts] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [notes, setNotes] = useState<GraphNote[]>([]);
  const [synthLoading, setSynthLoading] = useState(false);
  const [evoLoading, setEvoLoading] = useState(false);
  const [evo, setEvo] = useState<Evolution | null>(null);
  const [actionError, setActionError] = useState("");
  const zoomRef = useRef(1);
  const selectedRef = useRef("");
  zoomRef.current = zoom;
  selectedRef.current = selected;

  // Meta-notas autopoiéticas existentes
  useEffect(() => {
    fetch("/api/synthesize")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.notes) setNotes(d.notes); })
      .catch(() => {});
  }, []);

  // ── Acciones autopoiéticas sobre un concepto ─────────────────────
  const synthesize = async (concept: string) => {
    if (synthLoading) return;
    setSynthLoading(true); setActionError("");
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept }),
      });
      const data = await res.json();
      if (res.ok && data.note) {
        setNotes((p) => [data.note, ...p.filter((n) => n.concept !== data.note.concept)]);
        setSelected("n:" + data.note.id);
      } else setActionError(data.error || "Error al sintetizar");
    } catch { setActionError("Error de conexión"); }
    setSynthLoading(false);
  };

  const evolution = async (concept: string) => {
    if (evoLoading) return;
    setEvoLoading(true); setActionError(""); setEvo(null);
    try {
      const res = await fetch("/api/evolution", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept }),
      });
      const data = await res.json();
      if (res.ok) setEvo(data);
      else setActionError(data.error || "Error al trazar evolución");
    } catch { setActionError("Error de conexión"); }
    setEvoLoading(false);
  };
  const pan = useRef({ x: 0, y: 0 });
  const hover = useRef<number>(-1);
  const drag = useRef<{ node: number; panning: boolean; px: number; py: number }>({ node: -1, panning: false, px: 0, py: 0 });

  const folderColor = useMemo(() => {
    const folders = [...new Set(chats.map((c) => c.folder || "General"))].sort();
    const map: Record<string, string> = {};
    folders.forEach((f, i) => { map[f] = FOLDER_COLORS[i % FOLDER_COLORS.length]; });
    return map;
  }, [chats]);

  // ─── Construcción de nodos y aristas ─────────────────────────────
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const idx: Record<string, number> = {};
    const conceptCount: Record<string, number> = {};
    for (const c of chats) for (const k of c.concepts || []) conceptCount[k] = (conceptCount[k] || 0) + 1;

    for (const c of chats) {
      idx[c.id] = nodes.length;
      const seed = hashStr(c.id);
      nodes.push({
        id: c.id, label: c.title || "Sin título", kind: "chat", folder: c.folder,
        x: Math.cos(seed % 360) * (120 + (seed % 160)),
        y: Math.sin(seed % 360) * (120 + (seed % 160)),
        vx: 0, vy: 0,
        r: 6 + Math.min(4, (c.concepts?.length || 0)),
      });
    }
    const edges: Edge[] = [];
    for (const l of links) {
      if (idx[l.source] === undefined || idx[l.target] === undefined) continue;
      edges.push({ a: idx[l.source], b: idx[l.target], w: l.weight, kind: "cc" });
    }
    if (showConcepts) {
      // Conceptos compartidos por ≥2 chats o con meta-nota (como los tags de Obsidian)
      const noted = new Set(notes.map((n) => n.concept));
      for (const [k, n] of Object.entries(conceptCount)) {
        if (n < 2 && !noted.has(k)) continue;
        const seed = hashStr("k:" + k);
        const ki = nodes.length;
        idx["k:" + k] = ki;
        nodes.push({
          id: "k:" + k, label: k, kind: "concept",
          x: Math.cos(seed % 360) * (60 + (seed % 220)),
          y: Math.sin(seed % 360) * (60 + (seed % 220)),
          vx: 0, vy: 0, r: 3.5,
        });
        for (const c of chats) {
          if ((c.concepts || []).includes(k)) edges.push({ a: idx[c.id], b: ki, w: 1, kind: "kc" });
        }
      }
    }
    // Meta-notas autopoiéticas: nodos dorados enlazados a sus chats fuente
    for (const note of notes) {
      const seed = hashStr("n:" + note.id);
      const ni = nodes.length;
      idx["n:" + note.id] = ni;
      nodes.push({
        id: "n:" + note.id, label: "◈ " + note.title, kind: "note",
        x: Math.cos(seed % 360) * (40 + (seed % 120)),
        y: Math.sin(seed % 360) * (40 + (seed % 120)),
        vx: 0, vy: 0, r: 7,
      });
      for (const src of note.sources) {
        if (idx[src] !== undefined) edges.push({ a: ni, b: idx[src], w: 2, kind: "nc" });
      }
      if (idx["k:" + note.concept] !== undefined) {
        edges.push({ a: ni, b: idx["k:" + note.concept], w: 1, kind: "nc" });
      }
    }
    return { nodes, edges };
  }, [chats, links, showConcepts, notes]);

  const selectedChat = chats.find((c) => c.id === selected);
  const selectedConcept = selected.startsWith("k:") ? selected.slice(2) : "";
  const selectedNote = selected.startsWith("n:")
    ? notes.find((n) => n.id === selected.slice(2))
    : undefined;
  const conceptChats = useMemo(
    () => (selectedConcept ? chats.filter((c) => (c.concepts || []).includes(selectedConcept)) : []),
    [selectedConcept, chats]
  );
  const conceptNote = selectedConcept ? notes.find((n) => n.concept === selectedConcept) : undefined;
  const related = useMemo(() => {
    if (!selected) return [];
    return links
      .filter((l) => l.source === selected || l.target === selected)
      .map((l) => ({
        chat: chats.find((c) => c.id === (l.source === selected ? l.target : l.source)),
        shared: l.shared, weight: l.weight,
      }))
      .filter((r) => r.chat)
      .sort((a, b) => b.weight - a.weight);
  }, [selected, links, chats]);

  // ─── Simulación + render ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let alpha = 1;
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = wrap.clientWidth * dpr;
      canvas.height = wrap.clientHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const neighbors = (i: number): Set<number> => {
      const s = new Set<number>();
      for (const e of edges) {
        if (e.a === i) s.add(e.b);
        if (e.b === i) s.add(e.a);
      }
      return s;
    };

    const tick = () => {
      // Física: repulsión + resortes + gravedad al centro
      if (alpha > 0.005) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
            const d2 = Math.max(dx * dx + dy * dy, 64);
            const f = (1400 / d2) * alpha;
            const d = Math.sqrt(d2);
            nodes[i].vx -= (dx / d) * f; nodes[i].vy -= (dy / d) * f;
            nodes[j].vx += (dx / d) * f; nodes[j].vy += (dy / d) * f;
          }
        }
        for (const e of edges) {
          const rest = e.kind === "kc" ? 55 : 90 - Math.min(30, e.w * 10);
          const dx = nodes[e.b].x - nodes[e.a].x, dy = nodes[e.b].y - nodes[e.a].y;
          const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const f = ((d - rest) / d) * 0.04 * alpha * (e.kind === "cc" ? 1 + e.w * 0.3 : 1);
          nodes[e.a].vx += dx * f; nodes[e.a].vy += dy * f;
          nodes[e.b].vx -= dx * f; nodes[e.b].vy -= dy * f;
        }
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          n.vx -= n.x * 0.004 * alpha; n.vy -= n.y * 0.004 * alpha;
          n.vx *= 0.85; n.vy *= 0.85;
          if (drag.current.node !== i) { n.x += n.vx; n.y += n.vy; }
        }
        alpha *= 0.995;
      }

      // Dibujo
      const zoom = zoomRef.current;
      const selected = selectedRef.current;
      const w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2 + pan.current.x, h / 2 + pan.current.y);
      ctx.scale(zoom, zoom);

      const selIdx = nodes.findIndex((n) => n.id === selected);
      const focusIdx = hover.current >= 0 ? hover.current : selIdx;
      const hood = focusIdx >= 0 ? neighbors(focusIdx) : null;

      for (const e of edges) {
        const dim = hood && !(e.a === focusIdx || e.b === focusIdx);
        ctx.strokeStyle = dim
          ? "rgba(180,180,172,0.15)"
          : e.kind === "cc"
            ? "rgba(0,168,90,0.35)"
            : e.kind === "nc"
              ? "rgba(184,134,11,0.45)"
              : "rgba(139,139,130,0.25)";
        ctx.lineWidth = e.kind === "cc" ? Math.min(3, 0.5 + e.w * 0.7) / zoom : e.kind === "nc" ? 1.2 / zoom : 0.6 / zoom;
        ctx.beginPath();
        ctx.moveTo(nodes[e.a].x, nodes[e.a].y);
        ctx.lineTo(nodes[e.b].x, nodes[e.b].y);
        ctx.stroke();
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const dim = hood && i !== focusIdx && !hood.has(i);
        const color = n.kind === "chat"
          ? folderColor[n.folder || "General"] || C.muted
          : n.kind === "note" ? C.gold : C.subtle;
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        if (i === selIdx) {
          ctx.strokeStyle = C.text; ctx.lineWidth = 1.5 / zoom;
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2); ctx.stroke();
        }
        // Etiquetas
        const showLabel = zoom > 0.65 || i === focusIdx || (hood ? hood.has(i) : false);
        if (showLabel) {
          ctx.fillStyle = dim ? C.subtle : n.kind === "chat" ? C.text : n.kind === "note" ? C.gold : C.muted;
          ctx.font = n.kind === "concept" ? `italic ${10 / zoom}px ${FONT}` : `700 ${11 / zoom}px ${FONT}`;
          ctx.textAlign = "center";
          const label = n.label.length > 22 ? n.label.slice(0, 22) + "…" : n.label;
          ctx.fillText(label, n.x, n.y + n.r + 12 / zoom);
        }
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // ─── Interacción ────────────────────────────────────────────────
    const toWorld = (cx: number, cy: number) => {
      const zoom = zoomRef.current;
      const rect = canvas.getBoundingClientRect();
      const w = canvas.width / dpr, h = canvas.height / dpr;
      return {
        x: (cx - rect.left - w / 2 - pan.current.x) / zoom,
        y: (cy - rect.top - h / 2 - pan.current.y) / zoom,
      };
    };
    const findNode = (cx: number, cy: number) => {
      const zoom = zoomRef.current;
      const p = toWorld(cx, cy);
      for (let i = nodes.length - 1; i >= 0; i--) {
        const dx = nodes[i].x - p.x, dy = nodes[i].y - p.y;
        if (dx * dx + dy * dy < Math.pow(nodes[i].r + 6 / zoom, 2)) return i;
      }
      return -1;
    };

    const down = (cx: number, cy: number) => {
      const i = findNode(cx, cy);
      drag.current = { node: i, panning: i === -1, px: cx, py: cy };
      if (i >= 0) alpha = Math.max(alpha, 0.3);
    };
    const move = (cx: number, cy: number) => {
      if (drag.current.node >= 0) {
        const p = toWorld(cx, cy);
        const n = nodes[drag.current.node];
        n.x = p.x; n.y = p.y; n.vx = 0; n.vy = 0;
        alpha = Math.max(alpha, 0.3);
      } else if (drag.current.panning) {
        pan.current.x += cx - drag.current.px;
        pan.current.y += cy - drag.current.py;
        drag.current.px = cx; drag.current.py = cy;
      } else {
        hover.current = findNode(cx, cy);
        canvas.style.cursor = hover.current >= 0 ? "pointer" : "default";
      }
    };
    const up = (cx: number, cy: number, moved: boolean) => {
      if (!moved) {
        const i = findNode(cx, cy);
        if (i >= 0) setSelected(nodes[i].id);
        else setSelected("");
      }
      drag.current = { node: -1, panning: false, px: 0, py: 0 };
    };

    let startX = 0, startY = 0;
    const onMouseDown = (e: MouseEvent) => { startX = e.clientX; startY = e.clientY; down(e.clientX, e.clientY); };
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onMouseUp = (e: MouseEvent) => up(e.clientX, e.clientY, Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 5);
    const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; startX = t.clientX; startY = t.clientY; down(t.clientX, t.clientY); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; move(t.clientX, t.clientY); };
    const onTouchEnd = (e: TouchEvent) => { const t = e.changedTouches[0]; up(t.clientX, t.clientY, Math.abs(t.clientX - startX) + Math.abs(t.clientY - startY) > 8); };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setZoom((z) => Math.min(3, Math.max(0.3, z * (e.deltaY < 0 ? 1.1 : 0.9)))); };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [nodes, edges, folderColor]);

  return (
    <div ref={wrapRef} className="relative flex-1 min-h-0" style={{ background: C.bg }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Controles */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {(["+", "−"] as const).map((s) => (
            <button key={s} onClick={() => setZoom((z) => Math.min(3, Math.max(0.3, z * (s === "+" ? 1.25 : 0.8))))}
              className="w-8 h-8 text-[14px] font-black border" style={{ background: C.surface, borderColor: C.border, color: C.text, fontFamily: FONT }}>
              {s}
            </button>
          ))}
          <button onClick={() => setShowConcepts(!showConcepts)}
            className="h-8 px-2.5 text-[10px] tracking-[0.06em] uppercase font-black border"
            style={{ background: showConcepts ? C.text : C.surface, color: showConcepts ? "#fff" : C.muted, borderColor: showConcepts ? C.text : C.border, fontFamily: FONT }}>
            ‡ Conceptos
          </button>
        </div>
        {/* Leyenda de carpetas */}
        <div className="px-2.5 py-2 border space-y-1 max-w-[180px]" style={{ background: C.surface, borderColor: C.border }}>
          {Object.entries(folderColor).map(([f, col]) => (
            <div key={f} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col }} />
              <span className="text-[10px] font-black truncate" style={{ color: C.muted, fontFamily: FONT }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tarjeta hermenéutica del nodo seleccionado */}
      {selectedChat && (
        <div className="absolute bottom-3 left-3 right-3 md:right-auto md:w-[340px] border p-4 shadow-sm"
          style={{ background: C.surface, borderColor: C.border, fontFamily: FONT }}>
          <div className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: folderColor[selectedChat.folder || "General"] }} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-black leading-snug" style={{ color: C.text }}>{selectedChat.title}</div>
              <div className="text-[9px] tracking-[0.1em] uppercase font-black mt-0.5" style={{ color: C.subtle }}>📁 {selectedChat.folder}</div>
            </div>
            <button onClick={() => setSelected("")} className="text-[14px] font-black" style={{ color: C.subtle }}>×</button>
          </div>
          {selectedChat.summary && (
            <p className="text-[12px] leading-relaxed font-bold mt-2" style={{ color: C.muted }}>{selectedChat.summary}</p>
          )}
          {(selectedChat.concepts?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedChat.concepts!.map((k) => (
                <span key={k} className="text-[10px] font-black px-1.5 py-0.5 border" style={{ color: C.accent, borderColor: "rgba(0,168,90,0.25)", background: "rgba(0,168,90,0.06)" }}>
                  [[{k}]]
                </span>
              ))}
            </div>
          )}
          {related.length > 0 && (
            <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="text-[9px] tracking-[0.1em] uppercase font-black mb-1" style={{ color: C.subtle }}>Relacionados</div>
              {related.slice(0, 4).map((r) => (
                <button key={r.chat!.id} onClick={() => setSelected(r.chat!.id)}
                  className="block w-full text-left text-[11px] font-bold truncate py-0.5 hover:underline" style={{ color: C.text }}>
                  → {r.chat!.title} <span style={{ color: C.subtle }}>({r.shared.join(", ")})</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => onOpen(selectedChat.id)}
            className="w-full mt-3 py-2 text-[11px] font-black tracking-[0.04em] border"
            style={{ background: C.text, color: "#fff", borderColor: C.text }}>
            Abrir chat
          </button>
        </div>
      )}

      {/* Tarjeta de concepto: síntesis autopoiética + evolución temporal */}
      {selectedConcept && (
        <div className="absolute bottom-3 left-3 right-3 md:right-auto md:w-[360px] max-h-[70%] overflow-y-auto border p-4 shadow-sm"
          style={{ background: C.surface, borderColor: C.border, fontFamily: FONT }}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-black" style={{ color: C.text }}>[[{selectedConcept}]]</div>
              <div className="text-[9px] tracking-[0.1em] uppercase font-black mt-0.5" style={{ color: C.subtle }}>
                Concepto · {conceptChats.length} chat{conceptChats.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={() => { setSelected(""); setEvo(null); setActionError(""); }} className="text-[14px] font-black" style={{ color: C.subtle }}>×</button>
          </div>

          <div className="flex gap-1.5 mt-3">
            <button onClick={() => synthesize(selectedConcept)} disabled={synthLoading}
              className="flex-1 py-2 text-[10px] tracking-[0.04em] uppercase font-black border disabled:opacity-50"
              style={{ background: C.goldBg, borderColor: "rgba(184,134,11,0.3)", color: C.gold }}>
              {synthLoading ? "Sintetizando…" : conceptNote ? "◈ Re-sintetizar" : "◈ Sintetizar"}
            </button>
            <button onClick={() => evolution(selectedConcept)} disabled={evoLoading || conceptChats.length < 2}
              className="flex-1 py-2 text-[10px] tracking-[0.04em] uppercase font-black border disabled:opacity-40"
              style={{ background: "transparent", borderColor: C.border, color: C.muted }}>
              {evoLoading ? "Trazando…" : "⧖ Evolución"}
            </button>
          </div>
          {actionError && (
            <p className="text-[11px] font-bold mt-2" style={{ color: C.red }}>{actionError}</p>
          )}

          {conceptNote && (
            <button onClick={() => setSelected("n:" + conceptNote.id)}
              className="block w-full text-left text-[11px] font-bold mt-2 underline underline-offset-2" style={{ color: C.gold }}>
              ◈ Ver meta-nota: {conceptNote.title}
            </button>
          )}

          <div className="mt-2">
            {conceptChats.slice(0, 5).map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className="block w-full text-left text-[11px] font-bold truncate py-0.5 hover:underline" style={{ color: C.text }}>
                → {c.title}
              </button>
            ))}
          </div>

          {/* Evolución temporal del pensamiento */}
          {evo && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="text-[9px] tracking-[0.1em] uppercase font-black mb-1.5" style={{ color: C.subtle }}>⧖ Evolución del pensamiento</div>
              <p className="text-[12px] leading-relaxed font-bold whitespace-pre-wrap" style={{ color: C.text }}>{evo.narrative}</p>
              {evo.contradictions.length > 0 && (
                <div className="mt-2 px-3 py-2 border" style={{ background: "rgba(212,68,44,0.05)", borderColor: "rgba(212,68,44,0.2)" }}>
                  <div className="text-[9px] tracking-[0.1em] uppercase font-black mb-1" style={{ color: C.red }}>Δ Contradicciones detectadas</div>
                  {evo.contradictions.map((cx, i) => (
                    <p key={i} className="text-[11px] leading-relaxed font-bold" style={{ color: C.red }}>• {cx}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tarjeta de meta-nota autopoiética (nodo dorado) */}
      {selectedNote && (
        <div className="absolute bottom-3 left-3 right-3 md:right-auto md:w-[380px] max-h-[70%] overflow-y-auto border p-4 shadow-sm"
          style={{ background: C.surface, borderColor: "rgba(184,134,11,0.4)", fontFamily: FONT }}>
          <div className="flex items-start gap-2">
            <span className="text-[14px] shrink-0" style={{ color: C.gold }}>◈</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-black leading-snug" style={{ color: C.text }}>{selectedNote.title}</div>
              <div className="text-[9px] tracking-[0.1em] uppercase font-black mt-0.5" style={{ color: C.gold }}>
                Meta-nota autopoiética · [[{selectedNote.concept}]]
              </div>
            </div>
            <button onClick={() => setSelected("")} className="text-[14px] font-black" style={{ color: C.subtle }}>×</button>
          </div>
          <div className="text-[12px] leading-relaxed font-bold mt-2.5 whitespace-pre-wrap" style={{ color: C.text }}>
            {selectedNote.content}
          </div>
          <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="text-[9px] tracking-[0.1em] uppercase font-black mb-1" style={{ color: C.subtle }}>Chats fuente</div>
            {selectedNote.sources.map((sid) => {
              const c = chats.find((x) => x.id === sid);
              return c ? (
                <button key={sid} onClick={() => setSelected(sid)}
                  className="block w-full text-left text-[11px] font-bold truncate py-0.5 hover:underline" style={{ color: C.text }}>
                  → {c.title}
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {chats.filter((c) => (c.concepts?.length || 0) > 0).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-[300px]">
            <div className="text-3xl mb-3" style={{ color: C.subtle }}>‡</div>
            <p className="text-[12px] font-bold leading-relaxed" style={{ color: C.muted, fontFamily: FONT }}>
              Aún no hay chats clasificados. Pulsa <span className="font-black">‡ Organizar</span> en la barra lateral para que la IA clasifique tu historial.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
