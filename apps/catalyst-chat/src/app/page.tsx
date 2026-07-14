"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Canvas from "./Canvas";
import Artifact from "./Artifact";
import Markdown from "./Markdown";
import Fuse from "fuse.js";

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  citations?: { title: string; url: string; snippet: string }[];
  feedback?: "up" | "down";
};
type Mode = "catalyst" | "pentetraktys" | "boo" | "zettelkasten";
type Depth = "surface" | "medium" | "deep" | "frontier";
type Think = "off" | "high" | "max";

interface Chat {
  id: string; title: string; date: string; messages: Msg[];
  mode: Mode; depth: Depth; thinking: Think; folder: string;
}

function load<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
}

const MODES = [
  { k: "catalyst" as Mode, l: "Catalyst", i: "◆", c: "#00a85a" },
  { k: "pentetraktys" as Mode, l: "Pentetraktys 4D", i: "Δ", c: "#d4442c" },
  { k: "boo" as Mode, l: "Boo Compiler", i: "ψ", c: "#b83820" },
  { k: "zettelkasten" as Mode, l: "Zettelkasten", i: "‡", c: "#4a4a4a" },
];
const DEPTHS = [
  { k: "surface" as Depth, l: "Superficie", c: "#00a85a" },
  { k: "medium" as Depth, l: "Medio", c: "#d4902c" },
  { k: "deep" as Depth, l: "Profundo", c: "#b83820" },
  { k: "frontier" as Depth, l: "Frontera", c: "#d4442c" },
];
const THINKS = [
  { k: "off" as Think, l: "Rápido", i: "→" },
  { k: "high" as Think, l: "Pensar", i: "⊞" },
  { k: "max" as Think, l: "Profundo", i: "⊡" },
];
const DFOLDERS = ["General", "Investigación", "Código", "Creativo", "Negocios", "Personal"];

function dateGroup(chats: Chat[]): Record<string, Chat[]> {
  const g: Record<string, Chat[]> = {};
  const n = new Date();
  for (const c of chats) {
    const d = Math.floor((n.getTime() - new Date(c.date).getTime()) / 864e5);
    const k = d === 0 ? "Hoy" : d === 1 ? "Ayer" : d < 7 ? "Esta semana" : d < 30 ? "Este mes"
      : new Date(c.date).toLocaleDateString("es-MX", { month: "short", year: "numeric" });
    (g[k] ||= []).push(c);
  }
  return g;
}

const PROMPTS = [
  { i: "→", l: "Analizar", p: "Analiza estos datos y dame las claves:" },
  { i: "→", l: "Depurar", p: "Depura este error y explica la causa raíz:\n\n```\n\n```" },
  { i: "→", l: "Resumir", p: "Resume en 3 puntos clave:\n\n" },
  { i: "→", l: "Redactar", p: "Redacta un texto profesional sobre:\n\n" },
  { i: "→", l: "Idear", p: "Genera 10 ideas creativas para:\n\n" },
  { i: "→", l: "Investigar", p: "Investigación profunda con análisis estructurado:\n\n" },
];

const FONT = "'Times New Roman', Times, serif";

// ─── Swiss color system ────────────────────────────────────────────────
const C = {
  bg: "#f4f4f0", surface: "#fff", sidebar: "#ecece6",
  text: "#1a1a1a", muted: "#8b8b82", subtle: "#b4b4ac", border: "#d4d4cc",
  accent: "#00a85a", accentBg: "rgba(0,168,90,0.08)",
  red: "#d4442c", redBg: "rgba(212,68,44,0.06)",
  amber: "#d4902c", amberBg: "rgba(212,144,44,0.08)",
  charcoal: "#2d2d2d",
};

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [chats, setChats] = useState<Chat[]>([]);
  const [aid, setAid] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [inp, setInp] = useState("");
  const [ld, setLd] = useState(false);
  const [mode, setMode] = useState<Mode>("catalyst");
  const [depth, setDepth] = useState<Depth>("surface");
  const [think, setThink] = useState<Think>("off");
  const [research, setResearch] = useState(false);
  const [web, setWeb] = useState(false);
  const [side, setSide] = useState(true);
  const [canvas, setCanvas] = useState(false);
  const [cContent, setCContent] = useState("");
  const [streamThink, setStreamThink] = useState("");
  const [showThink, setShowThink] = useState<Record<number, boolean>>({});
  const [folders, setFolders] = useState<string[]>(DFOLDERS);
  const [filtFolder, setFiltFolder] = useState("");
  const [nf, setNf] = useState("");
  const [search, setSearch] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [voice, setVoice] = useState(false);
  const [templates, setTemplates] = useState(false);
  const [compare, setCompare] = useState(false);
  const [cMode, setCMode] = useState<Mode>("pentetraktys");
  const [loaded, setLoaded] = useState(false);
  const [importBanner, setImportBanner] = useState(0);
  const [userOpen, setUserOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Detectar móvil
  useEffect(() => {
    const check = () => { const m = window.innerWidth < 768; setIsMobile(m); if (!m) setSideOpen(false); };
    check(); window.addEventListener("resize", check); return () => window.removeEventListener("resize", check);
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const inpRef = useRef<HTMLTextAreaElement>(null);

  // ─── Auth ──────────────────────────────────────────────────────────
  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);

  // ─── Cargar chats ──────────────────────────────────────────────────
  useEffect(() => { if (status === "authenticated" && !loaded) fetchChats(); }, [status, loaded]);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (!res.ok) { setLoaded(true); return; }
      const data = await res.json();
      const serverChats: Chat[] = data.chats.map((c: any) => ({
        id: c.id, title: c.title, date: new Date(c.createdAt).toISOString(),
        mode: c.mode, depth: c.depth, thinking: c.thinking, folder: c.folder, messages: [],
      }));
      const local: Chat[] = load("catalyst_v3", []);
      const serverIds = new Set(serverChats.map((c) => c.id));
      const missing = local.filter((c) => !serverIds.has(c.id));
      if (missing.length > 0) setImportBanner(missing.length);
      setChats(serverChats);
    } catch { setChats(load("catalyst_v3", [])); }
    setLoaded(true);
  };

  const importLocalChats = async () => {
    const local: Chat[] = load("catalyst_v3", []);
    const serverIds = new Set(chats.map((c) => c.id));
    const missing = local.filter((c) => !serverIds.has(c.id));
    for (const chat of missing) {
      try {
        await fetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: chat.id, title: chat.title, mode: chat.mode, depth: chat.depth, thinking: chat.thinking, folder: chat.folder }) });
        for (const msg of chat.messages) {
          await fetch(`/api/chats/${chat.id}`, { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: msg.id, role: msg.role, content: msg.content, thinking: msg.thinking, feedback: msg.feedback }) });
        }
      } catch { /* skip */ }
    }
    setImportBanner(0); setLoaded(false);
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages.map((m: any) => ({
        id: m.id, role: m.role, content: m.content, thinking: m.thinking,
        citations: m.citations ? JSON.parse(m.citations) : undefined, feedback: m.feedback,
      }));
    } catch { return []; }
  };

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [msgs, streamThink]);

  const active = chats.find((c) => c.id === aid);
  const fuse = useMemo(() => new Fuse(chats, { keys: ["title", "messages.content"], threshold: 0.4 }), [chats]);
  const searched = search ? fuse.search(search).map((r) => r.item) : chats;
  const filtered = filtFolder ? searched.filter((c) => c.folder === filtFolder) : searched;

  // ─── Acciones ──────────────────────────────────────────────────────
  const newChat = () => {
    const c: Chat = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: "Nuevo chat", date: new Date().toISOString(), messages: [],
      mode, depth, thinking: think, folder: filtFolder || "General",
    };
    fetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, title: c.title, mode: c.mode, depth: c.depth, thinking: c.thinking, folder: c.folder }) }).catch(() => {});
    setChats((p) => [c, ...p]); setAid(c.id); setMsgs([]); setCanvas(false); setCContent("");
  };

  const select = async (id: string) => {
    setAid(id);
    const c = chats.find((x) => x.id === id);
    if (c) {
      setMode(c.mode); setDepth(c.depth); setThink(c.thinking);
      if (c.messages.length === 0) {
        const serverMsgs = await loadChatMessages(id);
        setMsgs(serverMsgs.length > 0 ? serverMsgs : c.messages);
        if (serverMsgs.length > 0) setChats((p) => p.map((ch) => (ch.id === id ? { ...ch, messages: serverMsgs } : ch)));
      } else setMsgs(c.messages);
    }
  };

  const del = (id: string) => {
    fetch(`/api/chats?id=${id}`, { method: "DELETE" }).catch(() => {});
    setChats((p) => p.filter((c) => c.id !== id));
    if (aid === id) { setAid(""); setMsgs([]); }
  };

  const addF = () => {
    if (nf.trim() && !folders.includes(nf.trim())) {
      setFolders((p) => [...p, nf.trim()]); setNf("");
    }
  };

  const moveToFolder = async (chatId: string, folder: string) => {
    setChats((p) => p.map((c) => (c.id === chatId ? { ...c, folder } : c)));
    fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    }).catch(() => {});
  };

  const fb = (idx: number, v: "up" | "down") => {
    const u = msgs.map((m, i) => (i === idx ? { ...m, feedback: v } : m));
    setMsgs(u); setChats((p) => p.map((c) => (c.id === aid ? { ...c, messages: u } : c)));
  };

  const shareChat = () => {
    const d = encodeURIComponent(JSON.stringify({ messages: msgs, mode, title: active?.title }));
    const l = `${window.location.origin}?share=${d}`; setShareLink(l); navigator.clipboard.writeText(l);
    setTimeout(() => setShareLink(""), 3000);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.lang = "es-MX";
    r.onresult = (e: any) => { setInp((p) => p + " " + e.results[0][0].transcript); setVoice(false); };
    r.onerror = () => setVoice(false); r.onend = () => setVoice(false);
    setVoice(true); r.start();
  };

  const detectArtifact = (c: string) => { const m = c.match(/```(?:html|jsx|tsx)\n([\s\S]*?)```/); return m ? m[1] : null; };

  const send = async () => {
    if (!inp.trim() || ld || !session?.user) return;
    if (!aid) newChat();
    const u: Msg = { id: Date.now().toString(36), role: "user", content: inp };
    const n = [...msgs, u]; setMsgs(n); setInp(""); setStreamThink(""); setLd(true);
    if (aid) {
      fetch(`/api/chats/${aid}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, role: u.role, content: u.content }) }).catch(() => {});
    }
    setChats((p) => p.map((c) => c.id === aid ? { ...c, messages: n, title: n.find((m) => m.role === "user")?.content?.slice(0, 60) || c.title, mode, depth, thinking: think } : c));
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: n, mode, depth, thinking: think === "off" ? undefined : think, research, webSearch: web, chatId: aid })
      });
      const reader = r.body?.getReader(); const dec = new TextDecoder(); let cont = "", tt = "";
      setMsgs((p) => [...p, { role: "assistant", content: "" }]);
      while (reader) {
        const { done, value } = await reader.read(); if (done) break;
        for (const l of dec.decode(value).split("\n").filter((l) => l.startsWith("data: "))) {
          const d = l.slice(6); if (d === "[DONE]") continue;
          try {
            const p = JSON.parse(d);
            if (p.type === "thinking") { tt += p.content; setStreamThink(tt); }
            else if (p.type === "text" || p.content) {
              cont += p.content || p.text || "";
              setMsgs((p) => { const c = [...p]; c[c.length - 1] = { role: "assistant", content: cont, thinking: tt || undefined }; return c; });
            }
          } catch { /* skip */ }
        }
      }
      const f = [...n, { id: Date.now().toString(36), role: "assistant" as const, content: cont, thinking: tt || undefined }];
      setMsgs(f); setChats((p) => p.map((c) => (c.id === aid ? { ...c, messages: f } : c)));
      if (aid && cont) {
        const aiMsg = f[f.length - 1];
        fetch(`/api/chats/${aid}`, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: aiMsg.id, role: "assistant", content: cont, thinking: tt || undefined }) }).catch(() => {});
        fetch(`/api/chats/${aid}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: n.find((m) => m.role === "user")?.content?.slice(0, 60) || "Nuevo chat" }) }).catch(() => {});
      }
      if (cont.length > 300) { setCContent(cont); setCanvas(true); }
    } catch { setMsgs((p) => [...p, { role: "assistant", content: "Error de conexión." }]); }
    setLd(false);
  };

  const keyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const canvasQA = (action: string, sel?: string) => {
    const t = sel || cContent;
    const m: Record<string, string> = {
      polish: `Pule este texto:\n\n${t}`, expand: `Expande con más detalle:\n\n${t}`,
      shorten: `Haz más conciso:\n\n${t}`, fix_bugs: `Corrige errores:\n\n${t}`,
      add_comments: `Agrega comentarios:\n\n${t}`, review: `Revisa y sugiere mejoras:\n\n${t}`,
      summarize: `Resume en 3-5 puntos:\n\n${t}`,
    };
    setInp(m[action] || t);
    if (["polish", "expand", "shorten", "fix_bugs", "add_comments"].includes(action)) setTimeout(send, 100);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { const t = await f.text(); setInp((p) => p + `\n\n[${f.name}]\n${t.slice(0, 8000)}`); if (fileRef.current) fileRef.current.value = ""; }
  };

  // ─── Cargando ────────────────────────────────────────────────────
  if (status === "loading" || (status === "authenticated" && !loaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-center">
          <div className="text-4xl mb-4" style={{ color: C.accent, fontFamily: FONT }}>◆</div>
          <p className="text-[12px] tracking-[0.12em] uppercase font-black" style={{ color: C.muted, fontFamily: FONT }}>Cargando…</p>
        </div>
      </div>
    );
  }
  if (status === "unauthenticated") return null;

  const user = session?.user;

  return (
    <div className="flex h-screen" style={{ background: C.bg, color: C.text, fontFamily: FONT }}>
      {/* ═══════════════ BARRA LATERAL ═══════════════ */}
      {/* Mobile backdrop */}
      {isMobile && sideOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setSideOpen(false)} />
      )}
      {/* Sidebar: desktop siempre, mobile overlay */}
      {(isMobile ? sideOpen : side) && (
        <aside className={`${isMobile ? 'fixed left-0 top-0 bottom-0 z-50 w-[280px] shadow-2xl' : 'w-[260px]'} flex flex-col shrink-0`} style={{ background: C.sidebar, borderRight: `1px solid ${C.border}` }}>
          {/* Encabezado */}
          <div className="px-4 pt-5 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg" style={{ color: C.accent }}>◆</span>
              <span className="text-[14px] font-black tracking-tight" style={{ color: C.text }}>Catalyst</span>
              <span className="text-[9px] tracking-[0.14em] uppercase ml-auto font-black" style={{ color: C.subtle }}>BELL</span>
              {isMobile && (
                <button onClick={() => setSideOpen(false)} className="text-[16px] font-black ml-2" style={{ color: C.muted }}>×</button>
              )}
            </div>
            <button onClick={newChat}
              className="w-full py-2.5 text-[12px] font-black tracking-[0.04em] transition-all duration-150 border"
              style={{ background: C.text, color: "#fff", borderColor: C.text }}>
              + Nuevo chat
            </button>
          </div>

          {/* Búsqueda */}
          <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…"
              className="w-full bg-transparent text-[12px] font-bold py-1.5 outline-none placeholder:text-[#b4b4ac]"
              style={{ color: C.text, fontFamily: FONT }} />
          </div>

          {/* Banner importar */}
          {importBanner > 0 && (
            <div className="mx-4 mt-3 px-3 py-2.5 text-[11px] leading-relaxed font-bold border"
              style={{ background: C.amberBg, borderColor: "rgba(212,144,44,0.2)", color: C.amber, fontFamily: FONT }}>
              {importBanner} chat{importBanner > 1 ? "s" : ""} local{importBanner > 1 ? "es" : ""}.{" "}
              <button onClick={importLocalChats} className="underline font-black">Importar</button>
            </div>
          )}

          {/* Lista de chats */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {Object.entries(dateGroup(filtered)).map(([date, chs]) => (
              <div key={date}>
                <div className="text-[9px] tracking-[0.12em] uppercase px-2 py-2 font-black" style={{ color: C.subtle }}>{date}</div>
                {chs.map((c) => (
                  <div key={c.id}
                    className="group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-[12px] font-bold transition-colors duration-100 relative"
                    style={{ background: aid === c.id ? C.accentBg : "transparent", color: aid === c.id ? C.accent : C.muted }}>
                    <span className="text-[10px] opacity-60 shrink-0">{MODES.find((m) => m.k === c.mode)?.i}</span>
                    <span onClick={() => select(c.id)} className="truncate flex-1">{c.title?.slice(0, 28) || "Nuevo chat"}</span>
                    {/* Folder badge */}
                    <span className="text-[8px] tracking-[0.08em] uppercase font-black opacity-0 group-hover:opacity-100 shrink-0 px-1" style={{ color: C.subtle }}>
                      {c.folder?.slice(0, 6) || "General"}
                    </span>
                    {/* Move to folder — aparece en hover */}
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) { e.stopPropagation(); moveToFolder(c.id, e.target.value); e.target.value = ""; } }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-6 opacity-0 group-hover:opacity-100 text-[9px] bg-transparent outline-none cursor-pointer font-black"
                      style={{ color: C.subtle, border: "none", width: "14px" }}>
                      <option value="">▾</option>
                      {folders.filter((f) => f !== c.folder).map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <button onClick={(e) => { e.stopPropagation(); del(c.id); }}
                      className="opacity-0 group-hover:opacity-100 text-[12px] font-black shrink-0"
                      style={{ color: C.subtle }}>×</button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Usuario */}
          <div className="relative" style={{ borderTop: `1px solid ${C.border}` }}>
            {/* Carpetas */}
            <div className="px-3 pt-2.5 pb-2 space-y-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
              <select value={filtFolder} onChange={(e) => setFiltFolder(e.target.value)}
                className="w-full bg-transparent text-[11px] font-black py-1.5 outline-none cursor-pointer"
                style={{ color: filtFolder ? C.accent : C.subtle, fontFamily: FONT }}>
                <option value="">Todas las carpetas</option>
                {folders.map((f) => (<option key={f} value={f}>📁 {f}</option>))}
              </select>
              {filtFolder && (
                <button onClick={() => setFiltFolder("")}
                  className="text-[10px] font-black tracking-[0.06em] uppercase block" style={{ color: C.red }}>
                  Limpiar filtro
                </button>
              )}
              <div className="flex gap-1.5">
                <input value={nf} onChange={(e) => setNf(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addF(); }}
                  placeholder="Nueva carpeta…"
                  className="flex-1 bg-transparent text-[11px] font-bold py-1 outline-none placeholder:text-[#b4b4ac]"
                  style={{ color: C.text, fontFamily: FONT }} />
                <button onClick={addF}
                  className="text-[11px] font-black px-1.5 hover:opacity-70 transition-opacity" style={{ color: C.muted }}>+</button>
              </div>
            </div>

            {/* Perfil usuario */}
            <button onClick={() => setUserOpen(!userOpen)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-[#00000004] transition-colors">
              <div className="w-7 h-7 flex items-center justify-center text-[12px] font-black border"
                style={{ background: C.surface, borderColor: C.border, color: C.text }}>
                {user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-black truncate" style={{ color: C.text }}>{user?.name}</div>
                <div className="text-[10px] font-bold truncate" style={{ color: C.subtle }}>{user?.email}</div>
              </div>
            </button>
            {userOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-1 border shadow-sm" style={{ background: C.surface, borderColor: C.border }}>
                <button onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-3 py-2 text-[12px] font-black hover:bg-[#00000004] transition-colors" style={{ color: C.red }}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ═══════════════ PRINCIPAL ═══════════════ */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: C.bg }}>
        {/* Barra superior */}
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto shrink-0" style={{ borderBottom: `1px solid ${C.border}`, background: C.sidebar }}>
          <button onClick={() => isMobile ? setSideOpen(true) : setSide(!side)} className="px-1.5 py-1 text-[14px] font-black md:hidden" style={{ color: C.muted }}>☰</button>
          <button onClick={() => setSide(!side)} className="px-1.5 py-1 text-[14px] font-black hidden md:block" style={{ color: C.muted }}>☰</button>
          <div className="h-4 w-px mx-0.5" style={{ background: C.border }} />

          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}
            className="bg-transparent text-[11px] font-black px-2 py-1 outline-none cursor-pointer"
            style={{ color: MODES.find((m) => m.k === mode)?.c, fontFamily: FONT, border: "none" }}>
            {MODES.map((m) => (<option key={m.k} value={m.k}>{m.i} {m.l}</option>))}
          </select>

          <select value={depth} onChange={(e) => setDepth(e.target.value as Depth)}
            className="bg-transparent text-[11px] font-black px-2 py-1 outline-none cursor-pointer"
            style={{ color: C.muted, fontFamily: FONT, border: "none" }}>
            {DEPTHS.map((d) => (<option key={d.k} value={d.k}>{d.l}</option>))}
          </select>

          <select value={think} onChange={(e) => setThink(e.target.value as Think)}
            className="bg-transparent text-[11px] font-black px-2 py-1 outline-none cursor-pointer"
            style={{ color: C.muted, fontFamily: FONT, border: "none" }}>
            {THINKS.map((t) => (<option key={t.k} value={t.k}>{t.i} {t.l}</option>))}
          </select>

          <div className="h-4 w-px mx-0.5" style={{ background: C.border }} />

          <button onClick={() => setResearch(!research)}
            className="text-[10px] tracking-[0.06em] uppercase px-2 py-1 transition-colors font-black"
            style={{ color: research ? C.amber : C.subtle }}>Investigación</button>
          <button onClick={() => setWeb(!web)}
            className="text-[10px] tracking-[0.06em] uppercase px-2 py-1 transition-colors font-black"
            style={{ color: web ? "#4a7ab5" : C.subtle }}>Web</button>
          <button onClick={() => setCompare(!compare)}
            className="text-[10px] tracking-[0.06em] uppercase px-2 py-1 transition-colors font-black"
            style={{ color: compare ? C.red : C.subtle }}>Comparar</button>

          <div className="flex-1" />

          <button onClick={() => { setCanvas(!canvas); if (!canvas) { const l = [...msgs].reverse().find((m) => m.role === "assistant"); if (l) setCContent(l.content); } }}
            className="text-[10px] tracking-[0.06em] uppercase px-2 py-1 font-black" style={{ color: canvas ? C.accent : C.subtle }}>Editor</button>
          <button onClick={shareChat} className="text-[10px] tracking-[0.06em] uppercase px-2 py-1 font-black" style={{ color: C.subtle }}>Compartir</button>
          {shareLink && <span className="text-[9px] font-black" style={{ color: C.accent }}>Copiado</span>}
        </div>

        {/* Área de chat */}
        <div ref={chatRef} className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-4 md:px-8 py-4 md:py-8 space-y-4 md:space-y-6">
            {msgs.length === 0 && (
              <div className="text-center mt-20">
                <div className="text-5xl mb-6" style={{ color: C.accent }}>◆</div>
                <h1 className="text-[32px] font-black tracking-tight mb-2" style={{ color: C.text, letterSpacing: "-0.025em", fontFamily: FONT }}>
                  Catalyst AI
                </h1>
                <p className="text-[13px] leading-relaxed mb-8 font-bold" style={{ color: C.muted, fontFamily: FONT }}>
                  {MODES.find((m) => m.k === mode)?.l} · {DEPTHS.find((d) => d.k === depth)?.l}{think !== "off" && ` · ${THINKS.find((t) => t.k === think)?.l}`}{research && " · Investigación profunda"}
                </p>
                <div className="flex justify-center gap-2 flex-wrap max-w-md mx-auto">
                  {PROMPTS.slice(0, 4).map((p, i) => (
                    <button key={i} onClick={() => { setInp(p.p); setTimeout(send, 100); }}
                      className="text-[12px] font-bold px-4 py-2 border transition-colors duration-150"
                      style={{ background: C.surface, borderColor: C.border, color: C.muted, fontFamily: FONT }}>
                      {p.i} {p.l}
                    </button>
                  ))}
                </div>
                <button onClick={() => setTemplates(!templates)}
                  className="text-[10px] tracking-[0.08em] uppercase mt-5 font-black" style={{ color: C.subtle }}>
                  {templates ? "Menos" : "Más opciones"}
                </button>
                {templates && (
                  <div className="flex justify-center gap-2 flex-wrap mt-3 max-w-md mx-auto">
                    {PROMPTS.slice(4).map((p, i) => (
                      <button key={i} onClick={() => { setInp(p.p); setTemplates(false); setTimeout(send, 100); }}
                        className="text-[12px] font-bold px-4 py-2 border transition-colors duration-150"
                        style={{ background: C.surface, borderColor: C.border, color: C.muted, fontFamily: FONT }}>
                        {p.i} {p.l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[92%] md:max-w-[85%]">
                  {/* Etiqueta */}
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[9px] tracking-[0.1em] uppercase font-black" style={{ color: C.subtle, fontFamily: FONT }}>
                      {m.role === "user" ? "Tú" : MODES.find((x) => x.k === mode)?.i + " Catalyst"}
                    </span>
                    {m.thinking && (
                      <button onClick={() => setShowThink((p) => ({ ...p, [i]: !p[i] }))}
                        className="text-[9px] tracking-[0.08em] uppercase font-black" style={{ color: C.amber }}>
                        {showThink[i] ? "Ocultar" : "Razonamiento"}
                      </button>
                    )}
                  </div>

                  {/* Burbuja de razonamiento */}
                  {m.thinking && showThink[i] && (
                    <div className="mb-2 px-4 py-3 border font-bold text-[13px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto"
                      style={{ background: C.amberBg, borderColor: "rgba(212,144,44,0.2)", color: C.amber, fontFamily: FONT }}>
                      {m.thinking}
                    </div>
                  )}

                  {/* Contenido */}
                  <div className="px-5 py-4 border"
                    style={{
                      background: m.role === "user" ? C.accentBg : C.surface,
                      borderColor: m.role === "user" ? "rgba(0,168,90,0.15)" : C.border,
                      color: C.text,
                      fontFamily: FONT,
                    }}>
                    {m.content ? (
                      <Markdown content={m.content} mode={m.role === "assistant" ? mode : undefined} />
                    ) : (ld && i === msgs.length - 1 ? <span className="text-[15px] font-bold">…</span> : null)}

                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                        {m.citations.map((c, ci) => (
                          <a key={ci} href={c.url} target="_blank" rel="noopener"
                            className="block text-[12px] font-bold underline underline-offset-2" style={{ color: "#4a7ab5" }}>{c.title}</a>
                        ))}
                      </div>
                    )}

                    {(() => { const af = detectArtifact(m.content); if (af) return <div className="mt-3"><Artifact code={af} lang="html" /></div>; return null; })()}

                    {/* Retroalimentación */}
                    {m.role === "assistant" && (
                      <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
                        {(["up", "down"] as const).map((v) => (
                          <button key={v} onClick={() => fb(i, v)}
                            className="text-[11px] tracking-[0.04em] font-black transition-colors"
                            style={{ color: m.feedback === v ? C.accent : C.subtle }}>
                            {v === "up" ? "Útil" : "No útil"}
                          </button>
                        ))}
                        <button onClick={() => navigator.clipboard.writeText(m.content)}
                          className="text-[11px] tracking-[0.04em] font-black ml-auto" style={{ color: C.subtle }}>Copiar</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Modo comparar */}
            {compare && msgs.length > 0 && (
              <div className="border p-4 font-bold" style={{ borderColor: C.border, background: C.surface }}>
                <div className="text-[11px] tracking-[0.06em] uppercase mb-2 font-black" style={{ color: C.muted }}>
                  Comparar con:{" "}
                  <select value={cMode} onChange={(e) => setCMode(e.target.value as Mode)}
                    className="bg-transparent text-[11px] font-black outline-none cursor-pointer ml-1" style={{ color: C.text }}>
                    {MODES.filter((m) => m.k !== mode).map((m) => (<option key={m.k} value={m.k}>{m.i} {m.l}</option>))}
                  </select>
                </div>
                <div className="text-[12px]" style={{ color: C.subtle }}>Envía el mismo mensaje para comparar respuestas lado a lado.</div>
              </div>
            )}

            {/* Razonamiento en vivo */}
            {streamThink && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-3 border text-[13px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto font-bold"
                  style={{ background: C.amberBg, borderColor: "rgba(212,144,44,0.2)", color: C.amber, fontFamily: FONT }}>
                  <div className="text-[9px] tracking-[0.1em] uppercase mb-2 font-black" style={{ color: C.amber }}>Razonamiento…</div>
                  {streamThink}
                </div>
              </div>
            )}

            {/* Cargando */}
            {ld && !streamThink && (
              <div className="flex justify-start">
                <div className="px-5 py-4 border" style={{ background: C.surface, borderColor: C.border }}>
                  <span className="typing-dot inline-block w-2 h-2 mr-1" style={{ background: C.subtle }} />
                  <span className="typing-dot inline-block w-2 h-2 mr-1" style={{ background: C.subtle }} />
                  <span className="typing-dot inline-block w-2 h-2" style={{ background: C.subtle }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra de entrada */}
        <div className="p-3 md:p-4 shrink-0 sticky bottom-0 z-10" style={{ borderTop: `1px solid ${C.border}`, background: C.sidebar }}>
          <div className="max-w-[720px] mx-auto">
            {research && <div className="text-[10px] tracking-[0.06em] uppercase mb-2 text-center font-black" style={{ color: C.amber }}>Investigación profunda — análisis multi-ángulo</div>}
            {web && <div className="text-[10px] tracking-[0.06em] uppercase mb-2 text-center font-black" style={{ color: "#4a7ab5" }}>Búsqueda web activada</div>}
            <div className="flex items-end gap-2 px-4 py-3 border" style={{ background: C.surface, borderColor: C.border }}>
              <textarea ref={inpRef} value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={keyDown}
                placeholder="Escribe tu mensaje…"
                className="flex-1 bg-transparent resize-none outline-none text-[15px] leading-relaxed max-h-48 placeholder:text-[#b4b4ac] font-bold"
                style={{ color: C.text, fontFamily: FONT }} rows={1} disabled={ld} />
              <div className="flex items-center gap-1.5">
                <button onClick={startVoice} disabled={ld || voice}
                  className="text-[12px] px-1.5 transition-colors font-black" style={{ color: voice ? C.red : C.subtle }}>🎤</button>
                <label className="cursor-pointer text-[12px] px-1.5 transition-colors font-black" style={{ color: C.subtle }}>
                  📎<input ref={fileRef} type="file" onChange={handleFile} className="hidden" accept=".txt,.md,.json,.csv,.py,.js,.ts,.tsx,.sol,.pdf" />
                </label>
                <button onClick={send} disabled={ld || !inp.trim()}
                  className="ml-1 px-4 py-1.5 text-[12px] font-black tracking-[0.04em] transition-all duration-150 disabled:opacity-20"
                  style={{ background: ld || !inp.trim() ? "transparent" : C.text, color: ld || !inp.trim() ? C.subtle : "#fff" }}>
                  Enviar
                </button>
              </div>
            </div>
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[9px] tracking-[0.08em] uppercase font-black" style={{ color: C.subtle }}>BELL 13450.50 · DeepSeek V4</span>
              {user && <span className="text-[9px] tracking-[0.08em] uppercase font-black" style={{ color: C.subtle }}>{user.name}</span>}
            </div>
          </div>
        </div>
      </main>

      {/* Editor Canvas — fullscreen on mobile */}
      {canvas && (
        <div className={`${isMobile ? 'fixed inset-0 z-50' : 'w-[45%]'} shrink-0`}>
          <Canvas content={cContent} onContentChange={setCContent} onQuickAction={canvasQA} onClose={() => setCanvas(false)} />
        </div>
      )}
    </div>
  );
}
