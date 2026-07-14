"use client";

import { useState, useRef, useEffect } from "react";

type Version = { content: string; timestamp: number };
type CanvasMode = "editorial" | "code";

interface Props {
  content: string;
  onContentChange: (c: string) => void;
  onQuickAction: (action: string, selectedText?: string) => void;
  onClose: () => void;
}

const FONT = "'Times New Roman', Times, serif";

const C = {
  bg: "#f4f4f0", surface: "#fff", text: "#1a1a1a",
  muted: "#8b8b82", subtle: "#b4b4ac", border: "#d4d4cc", accent: "#00a85a",
};

const QUICK = [
  { label: "Pulir", action: "polish" },
  { label: "Expandir", action: "expand" },
  { label: "Acortar", action: "shorten" },
  { label: "Corregir", action: "fix_bugs" },
  { label: "Comentar", action: "add_comments" },
  { label: "Revisar", action: "review" },
  { label: "Resumir", action: "summarize" },
];

function wordCount(t: string): number { return t.trim() ? t.trim().split(/\s+/).length : 0; }
function charCount(t: string): number { return t.length; }
function readingTime(t: string): string {
  const w = wordCount(t);
  if (w < 100) return "< 1 min";
  const mins = Math.ceil(w / 200);
  return `${mins} min`;
}

export default function Canvas({ content, onContentChange, onQuickAction, onClose }: Props) {
  const [versions, setVersions] = useState<Version[]>([{ content, timestamp: Date.now() }]);
  const [vIdx, setVIdx] = useState(0);
  const [showChanges, setShowChanges] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [cMode, setCMode] = useState<CanvasMode>("editorial");
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (content !== versions[vIdx]?.content) {
      setVersions((prev) => [...prev.slice(0, vIdx + 1), { content, timestamp: Date.now() }]);
      setVIdx((prev) => prev + 1);
    }
  }, [content]);

  const undo = () => { if (vIdx > 0) { const n = vIdx - 1; setVIdx(n); onContentChange(versions[n].content); } };
  const redo = () => { if (vIdx < versions.length - 1) { const n = vIdx + 1; setVIdx(n); onContentChange(versions[n].content); } };

  const handleSelect = () => {
    const ta = editorRef.current;
    if (ta) { const s = ta.value.substring(ta.selectionStart, ta.selectionEnd); setSelectedText(s); }
  };

  const exportFile = (fmt: string) => {
    const blob = new Blob([content], { type: fmt === "md" ? "text/markdown" : "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `catalyst.${fmt}`; a.click();
  };

  const isCode = /function |class |import |const |let |var |```|def |print\(/.test(content);
  const wc = wordCount(content);
  const cc = charCount(content);
  const rt = readingTime(content);

  return (
    <div className="flex flex-col h-full" style={{ background: C.surface, borderLeft: `1px solid ${C.border}`, fontFamily: FONT }}>
      {/* ── Encabezado ──────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${C.border}`, background: "#ecece6" }}>
        <span className="text-[13px] font-black tracking-tight" style={{ color: C.text }}>Editor</span>

        {/* Toggle Editorial / Código */}
        <div className="flex border ml-2" style={{ borderColor: C.border }}>
          <button onClick={() => setCMode("editorial")}
            className="text-[10px] tracking-[0.06em] uppercase px-2.5 py-1 font-black transition-colors"
            style={{ background: cMode === "editorial" ? C.text : "transparent", color: cMode === "editorial" ? "#fff" : C.muted }}>
            Editorial
          </button>
          <button onClick={() => setCMode("code")}
            className="text-[10px] tracking-[0.06em] uppercase px-2.5 py-1 font-black transition-colors"
            style={{ background: cMode === "code" ? C.text : "transparent", color: cMode === "code" ? "#fff" : C.muted }}>
            Código
          </button>
        </div>

        {isCode && (
          <span className="text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 border font-black" style={{ borderColor: C.border, color: C.muted }}>
            {content.includes("def ") ? "py" : content.includes("function ") ? "js" : "txt"}
          </span>
        )}

        <div className="flex-1" />
        <button onClick={undo} disabled={vIdx === 0} className="text-[12px] px-1 disabled:opacity-20 font-black" style={{ color: C.muted }} title="Deshacer">↩</button>
        <button onClick={redo} disabled={vIdx >= versions.length - 1} className="text-[12px] px-1 disabled:opacity-20 font-black" style={{ color: C.muted }} title="Rehacer">↪</button>
        <button onClick={() => setShowChanges(!showChanges)}
          className="text-[10px] tracking-[0.06em] uppercase px-1 font-black" style={{ color: showChanges ? C.accent : C.muted }}>Δ</button>
        <button onClick={() => exportFile("md")}
          className="text-[10px] tracking-[0.06em] uppercase px-1 font-black" style={{ color: C.muted }}>Exportar</button>
        <button onClick={onClose} className="text-[16px] px-1 font-black" style={{ color: C.muted }}>×</button>
      </div>

      {/* ── Acciones rápidas ────────────────────────────── */}
      <div className="flex gap-0.5 px-3 py-2 overflow-x-auto shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
        {QUICK.map((a) => (
          <button key={a.action} onClick={() => onQuickAction(a.action, selectedText)}
            className="text-[10px] tracking-[0.04em] px-2.5 py-1 border transition-colors duration-100 whitespace-nowrap font-black"
            style={{ borderColor: C.border, color: C.muted, background: C.bg }}
            title={selectedText ? `Aplicar "${a.label}" a la selección` : a.label}>
            {a.label}
          </button>
        ))}
        {selectedText && (
          <span className="text-[10px] px-2 py-1 font-black" style={{ color: "#d4902c" }}>
            "{selectedText.slice(0, 25)}{selectedText.length > 25 ? "…" : ""}" seleccionado
          </span>
        )}
      </div>

      {/* ── Editor ──────────────────────────────────────── */}
      <textarea ref={editorRef} value={content} onChange={(e) => onContentChange(e.target.value)}
        onMouseUp={handleSelect} onKeyUp={handleSelect}
        className="flex-1 bg-transparent p-5 leading-relaxed resize-none outline-none border-none w-full placeholder:text-[#b4b4ac]"
        style={{
          color: C.text,
          fontFamily: cMode === "code" ? "'JetBrains Mono', 'Consolas', monospace" : FONT,
          fontSize: cMode === "code" ? "13px" : "16px",
          fontWeight: cMode === "code" ? 700 : 700,
          lineHeight: cMode === "code" ? 1.6 : 1.75,
        }}
        placeholder={cMode === "editorial" ? "Escribe o edita textos largos aquí…" : "Escribe o edita código aquí…"}
        spellCheck={cMode === "editorial"}
      />

      {/* ── Diferencias ─────────────────────────────────── */}
      {showChanges && vIdx > 0 && (
        <div className="p-3 shrink-0" style={{ borderTop: `1px solid ${C.border}`, background: C.bg }}>
          <div className="text-[10px] tracking-[0.08em] uppercase mb-1 font-black" style={{ color: C.subtle }}>
            v{vIdx - 1} → v{vIdx}
          </div>
          <div className="text-[11px] font-bold" style={{ color: C.muted }}>
            {versions[vIdx]?.content !== versions[vIdx - 1]?.content
              ? `${Math.abs(versions[vIdx]?.content.length - versions[vIdx - 1]?.content.length)} caracteres cambiados`
              : "Sin cambios"}
          </div>
        </div>
      )}

      {/* ── Barra de estado ─────────────────────────────── */}
      <div className="px-4 py-1.5 flex justify-between items-center text-[9px] tracking-[0.08em] uppercase shrink-0 font-black"
        style={{ borderTop: `1px solid ${C.border}`, background: C.bg, color: C.subtle }}>
        <span>v{vIdx + 1}/{versions.length} · {cMode === "editorial" ? "Editorial" : "Código"}</span>
        <span>
          {wc.toLocaleString("es-MX")} palabras · {cc.toLocaleString("es-MX")} caracteres · {rt}
        </span>
        <span>BELL 13450.50</span>
      </div>
    </div>
  );
}
