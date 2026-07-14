"use client";

import { useState } from "react";

interface Props { code: string; lang?: string; }

const C = {
  bg: "#f4f4f0",
  surface: "#fff",
  text: "#1a1a1a",
  muted: "#8b8b82",
  subtle: "#b4b4ac",
  border: "#d4d4cc",
  accent: "#00a85a",
};

export default function Artifact({ code, lang }: Props) {
  const [open, setOpen] = useState(false);

  const isHTML = lang === "html" || code.includes("<!DOCTYPE") || code.includes("<html") ||
    (code.includes("<div") && code.includes("</div>"));
  const isJSX = code.includes("export default") || code.includes("function App");

  if (!isHTML && !isJSX) return null;

  return (
    <div className="border" style={{ borderColor: C.border }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#ecece6", borderBottom: `1px solid ${C.border}` }}>
        <span className="text-[10px] tracking-[0.06em] uppercase font-semibold" style={{ color: C.accent }}>Artifact</span>
        <span className="text-[9px] tracking-[0.06em] uppercase" style={{ color: C.subtle }}>{lang || "html"}</span>
        <div className="flex-1" />
        <button onClick={() => setOpen(!open)}
          className="text-[10px] tracking-[0.04em] uppercase font-medium" style={{ color: C.muted }}>
          {open ? "Hide" : "Preview"}
        </button>
      </div>
      {open && (
        <iframe sandbox="allow-scripts" srcDoc={code}
          className="w-full h-96 bg-white border-0" title="Artifact preview" />
      )}
    </div>
  );
}
