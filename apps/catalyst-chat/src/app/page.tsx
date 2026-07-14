"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Canvas from "./Canvas";
import Artifact from "./Artifact";
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
  id: string;
  title: string;
  date: string;
  messages: Msg[];
  mode: Mode;
  depth: Depth;
  thinking: Think;
  folder: string;
}

function load<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
}
function save(k: string, v: any) {
  localStorage.setItem(k, JSON.stringify(v));
}

const MODES = [
  { k: "catalyst" as Mode, l: "Catalyst", i: "◆", c: "#00ff88" },
  { k: "pentetraktys" as Mode, l: "Pentetraktys 4D", i: "🔺", c: "#ffaa00" },
  { k: "boo" as Mode, l: "Boo Compiler", i: "🧬", c: "#ff6600" },
  { k: "zettelkasten" as Mode, l: "Zettelkasten", i: "📝", c: "#4488ff" },
];
const DEPTHS = [
  { k: "surface" as Depth, l: "Surface", c: "#00ff88" },
  { k: "medium" as Depth, l: "Medium", c: "#ffaa00" },
  { k: "deep" as Depth, l: "Deep", c: "#ff6600" },
  { k: "frontier" as Depth, l: "Frontier", c: "#ff0044" },
];
const THINKS = [
  { k: "off" as Think, l: "Fast", i: "⚡" },
  { k: "high" as Think, l: "Think", i: "🧠" },
  { k: "max" as Think, l: "Deep Think", i: "🔬" },
];
const DFOLDERS = ["General", "Research", "Code", "Creative", "Business", "Personal"];

function dateGroup(chats: Chat[]): Record<string, Chat[]> {
  const g: Record<string, Chat[]> = {};
  const n = new Date();
  for (const c of chats) {
    const d = Math.floor((n.getTime() - new Date(c.date).getTime()) / 864e5);
    const k =
      d === 0
        ? "Today"
        : d === 1
          ? "Yesterday"
          : d < 7
            ? "This Week"
            : d < 30
              ? "This Month"
              : new Date(c.date).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                });
    (g[k] ||= []).push(c);
  }
  return g;
}

const PROMPTS = [
  { i: "📊", l: "Analyze data", p: "Analyze this data and give me key insights, trends, and recommendations:" },
  { i: "🐛", l: "Debug code", p: "Debug this error and explain the root cause:\n\n```\n\n```" },
  { i: "📝", l: "Summarize", p: "Summarize the following in 3 key points:\n\n" },
  { i: "✉️", l: "Write email", p: "Write a professional email about:\n\nSubject: \nBody: " },
  { i: "🧠", l: "Brainstorm", p: "Brainstorm 10 creative ideas for:\n\n" },
  { i: "🔍", l: "Research", p: "Research this topic deeply with structured analysis:\n\n" },
  { i: "💻", l: "Code review", p: "Review this code and suggest improvements:\n\n```\n\n```" },
  { i: "📄", l: "Summarize doc", p: "Summarize this document in bullet points:\n\n" },
];

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [shareLink, setShareLink] = useState("");
  const [voice, setVoice] = useState(false);
  const [templates, setTemplates] = useState(false);
  const [memory, setMemory] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  const [cMode, setCMode] = useState<Mode>("pentetraktys");
  const [loaded, setLoaded] = useState(false);
  const [importBanner, setImportBanner] = useState(0); // number of local-only chats
  const chatRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inpRef = useRef<HTMLTextAreaElement>(null);

  // ─── Auth guard ────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // ─── Load chats from server ────────────────────────────────────────
  useEffect(() => {
    if (status !== "authenticated" || loaded) return;
    fetchChats();
  }, [status, loaded]);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (!res.ok) return;
      const data = await res.json();
      const serverChats: Chat[] = data.chats.map((c: any) => ({
        id: c.id,
        title: c.title,
        date: new Date(c.createdAt).toISOString(),
        mode: c.mode as Mode,
        depth: c.depth as Depth,
        thinking: c.thinking as Think,
        folder: c.folder,
        messages: [],
      }));

      // Check localStorage for chats not yet on server
      const local: Chat[] = load("catalyst_v3", []);
      const serverIds = new Set(serverChats.map((c) => c.id));
      const missing = local.filter((c) => !serverIds.has(c.id));
      if (missing.length > 0) {
        setImportBanner(missing.length);
      }

      setChats(serverChats);
    } catch {
      // Fallback to localStorage
      setChats(load("catalyst_v3", []));
    }
    setLoaded(true);
  };

  const importLocalChats = async () => {
    const local: Chat[] = load("catalyst_v3", []);
    const serverIds = new Set(chats.map((c) => c.id));
    const missing = local.filter((c) => !serverIds.has(c.id));

    for (const chat of missing) {
      try {
        await fetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: chat.id,
            title: chat.title,
            mode: chat.mode,
            depth: chat.depth,
            thinking: chat.thinking,
            folder: chat.folder,
          }),
        });
        // Save messages
        for (const msg of chat.messages) {
          await fetch(`/api/chats/${chat.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              thinking: msg.thinking,
              feedback: msg.feedback,
            }),
          });
        }
      } catch { /* skip failed imports */ }
    }

    setImportBanner(0);
    setLoaded(false); // trigger reload
  };

  // ─── Load messages for selected chat ───────────────────────────────
  const loadChatMessages = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.messages.map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        thinking: m.thinking,
        citations: m.citations ? JSON.parse(m.citations) : undefined,
        feedback: m.feedback,
      })) as Msg[];
    } catch {
      return [];
    }
  };

  // ─── Effects ───────────────────────────────────────────────────────
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [msgs, streamThink]);
  useEffect(() => {
    const f: string[] = [];
    for (const m of msgs) {
      if (m.role === "user") {
        const x = m.content.match(/(?:I am|I'm|my |I prefer|I like|I work|I live)[^.!?]+/gi);
        if (x) f.push(...x.map((s) => s.trim()));
      }
    }
    if (f.length) setMemory((p) => [...new Set([...p, ...f.slice(-10)])]);
  }, [msgs]);

  const active = chats.find((c) => c.id === aid);
  const fuse = useMemo(() => new Fuse(chats, { keys: ["title", "messages.content"], threshold: 0.4 }), [chats]);
  const searched = search ? fuse.search(search).map((r) => r.item) : chats;
  const filtered = filtFolder ? searched.filter((c) => c.folder === filtFolder) : searched;

  // ─── Chat actions ──────────────────────────────────────────────────
  const newChat = () => {
    const c: Chat = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: "New chat",
      date: new Date().toISOString(),
      messages: [],
      mode,
      depth,
      thinking: think,
      folder: filtFolder || "General",
    };
    // Save to server
    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, title: c.title, mode: c.mode, depth: c.depth, thinking: c.thinking, folder: c.folder }),
    }).catch(() => {});
    setChats((p) => [c, ...p]);
    setAid(c.id);
    setMsgs([]);
    setCanvas(false);
    setCContent("");
  };

  const select = async (id: string) => {
    setAid(id);
    const c = chats.find((x) => x.id === id);
    if (c) {
      setMode(c.mode);
      setDepth(c.depth);
      setThink(c.thinking);
      // Load messages from server
      if (c.messages.length === 0) {
        const serverMsgs = await loadChatMessages(id);
        setMsgs(serverMsgs.length > 0 ? serverMsgs : c.messages);
        if (serverMsgs.length > 0) {
          setChats((p) => p.map((ch) => (ch.id === id ? { ...ch, messages: serverMsgs } : ch)));
        }
      } else {
        setMsgs(c.messages);
      }
    }
  };

  const del = (id: string) => {
    fetch(`/api/chats?id=${id}`, { method: "DELETE" }).catch(() => {});
    setChats((p) => p.filter((c) => c.id !== id));
    if (aid === id) {
      setAid("");
      setMsgs([]);
    }
  };

  const addF = () => {
    if (nf.trim() && !folders.includes(nf.trim())) {
      setFolders((p) => [...p, nf.trim()]);
      setNf("");
    }
  };

  const fb = (idx: number, v: "up" | "down") => {
    const u = msgs.map((m, i) => (i === idx ? { ...m, feedback: v } : m));
    setMsgs(u);
    setChats((p) => p.map((c) => (c.id === aid ? { ...c, messages: u } : c)));
  };

  const speak = (t: string) => {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(t.replace(/[#*`>\[\]]/g, "")));
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "es-MX";
    r.onresult = (e: any) => { setInp((p) => p + " " + e.results[0][0].transcript); setVoice(false); };
    r.onerror = () => setVoice(false);
    r.onend = () => setVoice(false);
    setVoice(true);
    r.start();
  };

  const shareChat = () => {
    const d = encodeURIComponent(JSON.stringify({ messages: msgs, mode, title: active?.title }));
    const l = `${window.location.origin}?share=${d}`;
    setShareLink(l);
    navigator.clipboard.writeText(l);
    setTimeout(() => setShareLink(""), 3000);
  };

  const exportChat = (fmt: "md" | "json" | "txt") => {
    let c = "";
    const t = active?.title || "chat";
    if (fmt === "md") c = msgs.map((m) => `### ${m.role === "user" ? "You" : "Catalyst"}\n${m.content}\n`).join("\n---\n");
    else if (fmt === "json") c = JSON.stringify(msgs, null, 2);
    else c = msgs.map((m) => `[${m.role}] ${m.content}`).join("\n\n");
    const b = new Blob([c], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `${t}.${fmt}`;
    a.click();
  };

  const detectChart = (c: string) => {
    const t = c.match(/\|.+\|[\s\S]*?\n\n/);
    return t ? { type: "table", rows: t[0].split("\n").filter((l) => l.includes("|")).length - 2 } : null;
  };

  const detectArtifact = (c: string) => {
    const m = c.match(/```(?:html|jsx|tsx)\n([\s\S]*?)```/);
    return m ? m[1] : null;
  };

  const send = async () => {
    if (!inp.trim() || ld || !session?.user) return;
    if (!aid) newChat();

    const u: Msg = { id: Date.now().toString(36), role: "user", content: inp };
    const n = [...msgs, u];
    setMsgs(n);
    setInp("");
    setStreamThink("");
    setLd(true);

    // Save user message to server
    if (aid) {
      fetch(`/api/chats/${aid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, role: u.role, content: u.content }),
      }).catch(() => {});
    }

    setChats((p) =>
      p.map((c) =>
        c.id === aid
          ? {
              ...c,
              messages: n,
              title: n.find((m) => m.role === "user")?.content?.slice(0, 50) || c.title,
              mode,
              depth,
              thinking: think,
            }
          : c
      )
    );

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: n,
          mode,
          depth,
          thinking: think === "off" ? undefined : think,
          research,
          webSearch: web,
          chatId: aid,
        }),
      });
      const reader = r.body?.getReader();
      const dec = new TextDecoder();
      let cont = "", tt = "";
      setMsgs((p) => [...p, { role: "assistant", content: "" }]);
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const l of dec.decode(value).split("\n").filter((l) => l.startsWith("data: "))) {
          const d = l.slice(6);
          if (d === "[DONE]") continue;
          try {
            const p = JSON.parse(d);
            if (p.type === "thinking") {
              tt += p.content;
              setStreamThink(tt);
            } else if (p.type === "text" || p.content) {
              cont += p.content || p.text || "";
              setMsgs((p) => {
                const c = [...p];
                c[c.length - 1] = { role: "assistant", content: cont, thinking: tt || undefined };
                return c;
              });
            }
          } catch { /* skip malformed chunks */ }
        }
      }
      const f = [...n, { id: Date.now().toString(36), role: "assistant" as const, content: cont, thinking: tt || undefined }];
      setMsgs(f);
      setChats((p) => p.map((c) => (c.id === aid ? { ...c, messages: f } : c)));

      // Save assistant message to server
      const aiMsg = f[f.length - 1];
      if (aid && cont) {
        fetch(`/api/chats/${aid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: aiMsg.id, role: "assistant", content: cont, thinking: tt || undefined }),
        }).catch(() => {});
        // Update chat title
        fetch(`/api/chats/${aid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: n.find((m) => m.role === "user")?.content?.slice(0, 50) || "New chat" }),
        }).catch(() => {});
      }

      if (cont.length > 300) {
        setCContent(cont);
        setCanvas(true);
      }
    } catch {
      setMsgs((p) => [...p, { role: "assistant", content: "Error connecting." }]);
    }
    setLd(false);
  };

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const canvasQA = (action: string, sel?: string) => {
    const t = sel || cContent;
    const m: Record<string, string> = {
      polish: `Polish this for clarity:\n\n${t}`,
      expand: `Expand with more detail:\n\n${t}`,
      shorten: `Make more concise:\n\n${t}`,
      fix_bugs: `Fix bugs in this code:\n\n${t}`,
      add_comments: `Add explanatory comments:\n\n${t}`,
      review: `Review and suggest improvements:\n\n${t}`,
      summarize: `Summarize in 3-5 bullets:\n\n${t}`,
    };
    setInp(m[action] || t);
    if (["polish", "expand", "shorten", "fix_bugs", "add_comments"].includes(action)) setTimeout(send, 100);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const t = await f.text();
      setInp((p) => p + `\n\n[${f.name}]\n${t.slice(0, 4000)}`);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────
  if (status === "loading" || (status === "authenticated" && !loaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <div className="text-5xl mb-4 text-[#00ff88] animate-pulse">◆</div>
          <p className="text-gray-500 text-sm">Loading Catalyst AI...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null; // middleware redirects

  // ─── Theme colors ───────────────────────────────────────────────────
  const bg = theme === "dark" ? "#0a0a1a" : "#ffffff";
  const sidebarBg = theme === "dark" ? "#0d0d2a" : "#f9fafb";
  const chatBg = theme === "dark" ? "#0a0a1a" : "#ffffff";
  const userBg = theme === "dark" ? "#00ff8815" : "#f4f4f5";
  const aiBg = theme === "dark" ? "#1a1a3a" : "#ffffff";
  const border = theme === "dark" ? "#00ff8833" : "#e5e7eb";
  const subCol = theme === "dark" ? "text-gray-400" : "text-gray-500";
  const inputBg = theme === "dark" ? "#111133" : "#ffffff";
  const topBg = theme === "dark" ? "#0d0d20" : "#ffffff";

  const user = session?.user;

  return (
    <div className={`flex h-screen ${theme === "dark" ? "text-white" : "text-gray-900"}`} style={{ background: bg }}>
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      {side && (
        <aside className="w-[260px] flex flex-col shrink-0 border-r" style={{ background: sidebarBg, borderColor: border }}>
          <div className="p-3 space-y-2">
            <button
              onClick={newChat}
              className="w-full bg-[#00ff8822] border border-[#00ff8844] text-[#00ff88] rounded-xl py-2.5 font-semibold hover:bg-[#00ff8833] transition text-sm"
            >
              + New chat
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{ borderColor: border }}
            />
          </div>

          {/* Import banner */}
          {importBanner > 0 && (
            <div className="mx-3 mb-2 p-2 bg-[#ffaa0011] border border-[#ffaa0033] rounded-lg text-xs text-[#ffaa00] text-center">
              {importBanner} chat{importBanner > 1 ? "s" : ""} in this browser.{" "}
              <button onClick={importLocalChats} className="underline hover:text-white">
                Import
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 space-y-3">
            {filtFolder && (
              <div className="text-xs px-3 py-1 text-gray-500">
                Filtered: {filtFolder}{" "}
                <button onClick={() => setFiltFolder("")} className="ml-1 hover:text-white">×</button>
              </div>
            )}
            {Object.entries(dateGroup(filtered)).map(([date, chs]) => (
              <div key={date}>
                <div className="text-[10px] text-gray-600 px-3 py-1 uppercase tracking-wider font-semibold">{date}</div>
                {chs.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => select(c.id)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] transition ${aid === c.id ? "bg-[#00ff8811] text-[#00ff88]" : "text-gray-400 hover:bg-[#ffffff06]"}`}
                  >
                    <span className="text-xs opacity-50">{MODES.find((m) => m.k === c.mode)?.i}</span>
                    <span className="truncate flex-1">{c.title?.slice(0, 35) || "New chat"}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); del(c.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* User section */}
          <div className="p-3 border-t space-y-2" style={{ borderColor: border }}>
            <select
              value={filtFolder}
              onChange={(e) => setFiltFolder(e.target.value)}
              className="w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs text-gray-400"
              style={{ borderColor: border }}
            >
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>📁 {f}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <input
                value={nf}
                onChange={(e) => setNf(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addF()}
                placeholder="New folder..."
                className="flex-1 bg-transparent border rounded px-2 py-1 text-xs outline-none"
                style={{ borderColor: border }}
              />
              <button onClick={addF} className="text-xs text-gray-500 hover:text-white">+</button>
            </div>
            {/* User bar */}
            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: border }}>
              {user?.image ? (
                <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#00ff8833] flex items-center justify-center text-xs text-[#00ff88] font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-300 truncate">{user?.name || user?.email}</div>
                <div className="text-[10px] text-gray-600 truncate">{user?.email}</div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs text-gray-500 hover:text-red-400 transition"
                title="Sign out"
              >
                🚪
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: chatBg }}>
        {/* Top bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b overflow-x-auto" style={{ background: topBg, borderColor: border }}>
          <button onClick={() => setSide(!side)} className="text-gray-400 hover:text-white px-1">☰</button>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}
            className="bg-transparent border rounded-lg px-2 py-1 text-xs"
            style={{ color: MODES.find((m) => m.k === mode)?.c, borderColor: border }}>
            {MODES.map((m) => (<option key={m.k} value={m.k}>{m.i} {m.l}</option>))}
          </select>
          <select value={depth} onChange={(e) => setDepth(e.target.value as Depth)}
            className="bg-transparent border rounded-lg px-2 py-1 text-xs"
            style={{ borderColor: border }}>
            {DEPTHS.map((d) => (<option key={d.k} value={d.k}>{d.l}</option>))}
          </select>
          <select value={think} onChange={(e) => setThink(e.target.value as Think)}
            className="bg-transparent border rounded-lg px-2 py-1 text-xs text-gray-400"
            style={{ borderColor: border }}>
            {THINKS.map((t) => (<option key={t.k} value={t.k}>{t.i} {t.l}</option>))}
          </select>
          <button onClick={() => setResearch(!research)}
            className={`text-xs px-2 py-1 rounded-lg border transition ${research ? "bg-[#ff660022] border-[#ff660044] text-[#ff6600]" : "text-gray-500"}`}
            style={{ borderColor: research ? "#ff660044" : border }}>🔬 Research</button>
          <button onClick={() => setWeb(!web)}
            className={`text-xs px-2 py-1 rounded-lg border transition ${web ? "bg-[#4488ff22] border-[#4488ff44] text-[#4488ff]" : "text-gray-500"}`}
            style={{ borderColor: web ? "#4488ff44" : border }}>🌐 Web</button>
          <button onClick={() => setCompare(!compare)}
            className={`text-xs px-2 py-1 rounded-lg border transition ${compare ? "bg-[#ffaa0022] border-[#ffaa0044] text-[#ffaa00]" : "text-gray-500"}`}
            style={{ borderColor: compare ? "#ffaa0044" : border }}>⚖️ Compare</button>
          <div className="flex-1" />
          <button onClick={() => { setCanvas(!canvas); if (!canvas) { const l = [...msgs].reverse().find((m) => m.role === "assistant"); if (l) setCContent(l.content); } }}
            className={`text-xs px-2 py-1 rounded-lg border transition ${canvas ? "bg-[#00ff8822] border-[#00ff8844] text-[#00ff88]" : "text-gray-500"}`}
            style={{ borderColor: canvas ? "#00ff8844" : border }}>📄 Canvas</button>
          <button onClick={shareChat}
            className="text-xs px-2 py-1 rounded-lg border text-gray-500 hover:text-white" style={{ borderColor: border }}>🔗 Share</button>
          {shareLink && <span className="text-[10px] text-[#00ff88] animate-pulse">Copied!</span>}
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-xs px-2 py-1 rounded-lg border text-gray-400" style={{ borderColor: border }}>{theme === "dark" ? "☀️" : "🌙"}</button>
          <button onClick={() => exportChat("md")}
            className="text-xs px-2 py-1 rounded-lg border text-gray-400" style={{ borderColor: border }} title="Export">📥</button>
          <label className="cursor-pointer text-gray-400 hover:text-white text-sm">📎
            <input ref={fileRef} type="file" onChange={handleFile} className="hidden" accept=".txt,.md,.json,.csv,.py,.js,.ts,.tsx,.sol,.pdf" />
          </label>
        </div>

        {/* Chat area */}
        <div ref={chatRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {msgs.length === 0 && (
              <div className="text-center mt-16">
                <div className="text-5xl mb-4">◆</div>
                <h1 className={`text-2xl font-bold ${theme === "dark" ? "text-[#00ff88]" : "text-gray-800"} mb-1`}>Catalyst AI</h1>
                <p className={subCol + " text-sm mb-6"}>
                  {MODES.find((m) => m.k === mode)?.l} · {DEPTHS.find((d) => d.k === depth)?.l}
                  {think !== "off" && ` · ${THINKS.find((t) => t.k === think)?.l}`}
                  {research && " · Deep Research"}
                </p>
                <div className="flex justify-center gap-2 flex-wrap max-w-lg mx-auto">
                  {PROMPTS.slice(0, 4).map((p, i) => (
                    <button key={i} onClick={() => { setInp(p.p); setTimeout(send, 100); }}
                      className="border rounded-full px-4 py-2 text-[13px] text-gray-400 hover:text-white hover:border-[#00ff8844] transition"
                      style={{ borderColor: border }}>{p.i} {p.l}</button>
                  ))}
                </div>
                <button onClick={() => setTemplates(!templates)}
                  className="text-[11px] text-gray-500 mt-4 hover:text-white">More prompts ▾</button>
                {templates && (
                  <div className="flex justify-center gap-2 flex-wrap mt-2 max-w-lg mx-auto">
                    {PROMPTS.slice(4).map((p, i) => (
                      <button key={i} onClick={() => { setInp(p.p); setTemplates(false); setTimeout(send, 100); }}
                        className="border rounded-full px-4 py-2 text-[13px] text-gray-400 hover:text-white hover:border-[#00ff8844] transition"
                        style={{ borderColor: border }}>{p.i} {p.l}</button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%]">
                  <div className={`px-5 py-3.5 rounded-2xl ${m.role === "user" ? "border" : ""}`}
                    style={{ background: m.role === "user" ? userBg : aiBg, borderColor: m.role === "user" ? border : "transparent" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold" style={{ color: theme === "dark" ? "#888" : "#666" }}>
                        {m.role === "user" ? "You" : MODES.find((x) => x.k === mode)?.i + " Catalyst"}
                      </span>
                      {m.thinking && (
                        <button onClick={() => setShowThink((p) => ({ ...p, [i]: !p[i] }))}
                          className="text-[10px] text-[#ffaa00] hover:text-[#ffcc00]">
                          🧠 {showThink[i] ? "Hide" : "Think"}
                        </button>
                      )}
                    </div>
                    {m.thinking && showThink[i] && (
                      <div className="bg-[#0a0a12] border border-[#ffaa0033] rounded-lg p-3 mb-2 text-xs text-[#ffaa00] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {m.thinking}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed"
                      style={{ color: m.role === "user" ? (theme === "dark" ? "#eee" : "#111") : (theme === "dark" ? "#ddd" : "#333") }}>
                      {m.content || (ld && i === msgs.length - 1 ? "..." : "")}
                    </div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: border }}>
                        {m.citations.map((c, ci) => (
                          <a key={ci} href={c.url} target="_blank" rel="noopener"
                            className="block text-[11px] text-[#4488ff] hover:underline truncate">{c.title}</a>
                        ))}
                      </div>
                    )}
                    {(() => { const cd = detectChart(m.content); if (cd) return <div className="mt-2 text-[10px] text-[#ffaa00]">📊 Chart data ({cd.rows} rows)</div>; return null; })()}
                    {(() => { const af = detectArtifact(m.content); if (af) return <Artifact code={af} lang="html" />; return null; })()}
                    {m.role === "assistant" && (
                      <div className="flex gap-1 mt-2 pt-1.5 border-t border-[#ffffff08]">
                        <button onClick={() => { fb(i, "up"); navigator.clipboard.writeText(m.content); }}
                          className={`text-xs px-2 py-0.5 rounded ${m.feedback === "up" ? "bg-[#00ff8822] text-[#00ff88]" : "text-gray-600 hover:text-gray-400"}`}>👍</button>
                        <button onClick={() => fb(i, "down")}
                          className={`text-xs px-2 py-0.5 rounded ${m.feedback === "down" ? "bg-[#ff004422] text-[#ff0044]" : "text-gray-600 hover:text-gray-400"}`}>👎</button>
                        <button onClick={() => speak(m.content)}
                          className="text-xs px-2 py-0.5 rounded text-gray-600 hover:text-gray-400">🔊</button>
                        <button onClick={() => navigator.clipboard.writeText(m.content)}
                          className="text-xs px-2 py-0.5 rounded text-gray-600 hover:text-gray-400">📋</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Comparison mode */}
            {compare && msgs.length > 0 && (
              <div className="border rounded-2xl p-4" style={{ borderColor: border }}>
                <div className="text-xs text-gray-500 mb-2">
                  Compare with:{" "}
                  <select value={cMode} onChange={(e) => setCMode(e.target.value as Mode)}
                    className="bg-transparent border rounded px-2 py-0.5 text-xs ml-1"
                    style={{ borderColor: border }}>
                    {MODES.filter((m) => m.k !== mode).map((m) => (<option key={m.k} value={m.k}>{m.i} {m.l}</option>))}
                  </select>
                </div>
                <div className="text-xs text-gray-500 italic">Send the same prompt for side-by-side comparison</div>
              </div>
            )}

            {streamThink && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-[#0a0a12] border border-[#ffaa0033] rounded-2xl p-4 text-xs text-[#ffaa00] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  <div className="text-[10px] text-gray-500 mb-1">🧠 Thinking...</div>
                  {streamThink}
                </div>
              </div>
            )}
            {ld && !streamThink && (
              <div className="flex justify-start">
                <div className="px-5 py-3.5 rounded-2xl text-sm" style={{ background: aiBg }}>
                  <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-gray-400 mr-1" />
                  <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-gray-400 mr-1" />
                  <span className="typing-dot inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="p-4" style={{ background: chatBg }}>
          <div className="max-w-3xl mx-auto">
            {research && <div className="text-[11px] text-[#ff6600] mb-2 text-center">🔬 Deep Research — Multi-angle analysis with citations</div>}
            {web && <div className="text-[11px] text-[#4488ff] mb-2 text-center">🌐 Web Search enabled — responses include sources</div>}
            <div className="flex items-end gap-2 border rounded-2xl px-4 py-3 shadow-lg" style={{ background: inputBg, borderColor: border }}>
              <textarea ref={inpRef} value={inp} onChange={(e) => setInp(e.target.value)} onKeyDown={keyDown}
                placeholder="Message Catalyst AI..."
                className="flex-1 bg-transparent resize-none outline-none text-[15px] leading-relaxed max-h-48 placeholder-gray-500"
                style={{ color: theme === "dark" ? "white" : "#111" }} rows={1} disabled={ld} />
              <div className="flex items-center gap-1">
                <button onClick={startVoice} disabled={ld || voice}
                  className={`px-2 py-1 rounded-lg text-sm transition ${voice ? "text-[#ff0044] animate-pulse" : "text-gray-400 hover:text-white"}`} title="Voice">🎤</button>
                <button onClick={send} disabled={ld || !inp.trim()}
                  className="p-2 rounded-lg transition disabled:opacity-30"
                  style={{ background: ld || !inp.trim() ? "transparent" : "#00ff88", color: ld || !inp.trim() ? "#888" : "#0a0a1a" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9 22 2z" /></svg>
                </button>
              </div>
            </div>
            <div className="text-[11px] text-gray-500 text-center mt-2">
              Catalyst AI may produce inaccurate information. BELL 13450.50 · DeepSeek V4
              {user && <span className="ml-2">· {user.name || user.email}</span>}
            </div>
          </div>
        </div>
      </main>

      {/* Canvas side panel */}
      {canvas && (
        <div className="w-[45%] shrink-0">
          <Canvas content={cContent} onContentChange={setCContent} onQuickAction={canvasQA} onClose={() => setCanvas(false)} />
        </div>
      )}
    </div>
  );
}
