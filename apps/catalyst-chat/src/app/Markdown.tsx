"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props { content: string; mode?: "catalyst" | "pentetraktys" | "boo" | "zettelkasten"; }

const FONT = "'Times New Roman', Times, serif";

export default function Markdown({ content, mode }: Props) {
  const components: Components = {
    // ── Headings ───────────────────────────────────────────────
    h1: ({ children, ...props }) => (
      <h1 className="text-[26px] font-black mt-8 mb-4 leading-tight tracking-tight border-b pb-2" style={{ borderColor: "#d4d4cc", fontFamily: FONT }} {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-[20px] font-black mt-7 mb-3 leading-tight tracking-tight" style={{ fontFamily: FONT }} {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-[17px] font-black mt-6 mb-2 leading-snug tracking-tight" style={{ color: "#4a4a4a", fontFamily: FONT }} {...props}>{children}</h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="text-[15px] font-black mt-4 mb-2 uppercase tracking-[0.06em]" style={{ color: "#6b6b6b", fontFamily: FONT }} {...props}>{children}</h4>
    ),

    // ── Paragraph ──────────────────────────────────────────────
    p: ({ children, ...props }) => (
      <p className="mb-3 leading-relaxed" style={{ fontFamily: FONT, fontSize: "15px", textIndent: "0" }} {...props}>{children}</p>
    ),

    // ── Bold / Italic ──────────────────────────────────────────
    strong: ({ children, ...props }) => (
      <strong className="font-black" style={{ fontFamily: FONT }} {...props}>{children}</strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic font-bold" style={{ fontFamily: FONT }} {...props}>{children}</em>
    ),

    // ── Lists ──────────────────────────────────────────────────
    ul: ({ children, ...props }) => (
      <ul className="mb-3 pl-5 space-y-1 list-disc" style={{ fontFamily: FONT, fontSize: "15px" }} {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="mb-3 pl-5 space-y-1 list-decimal" style={{ fontFamily: FONT, fontSize: "15px" }} {...props}>{children}</ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-relaxed" style={{ fontFamily: FONT }} {...props}>{children}</li>
    ),

    // ── Blockquote ─────────────────────────────────────────────
    blockquote: ({ children, ...props }) => (
      <blockquote className="my-4 pl-4 py-2 border-l-[3px] italic font-bold" style={{ borderColor: "#00a85a", background: "rgba(0,168,90,0.04)", color: "#4a6b58", fontFamily: FONT }} {...props}>{children}</blockquote>
    ),

    // ── Code ───────────────────────────────────────────────────
    code: ({ children, className, ...props }: any) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code className="px-1.5 py-0.5 text-[13px] font-bold" style={{ background: "rgba(0,0,0,0.06)", borderRadius: "2px", fontFamily: "'JetBrains Mono', 'Consolas', monospace", color: "#b83820" }} {...props}>{children}</code>
        );
      }
      return (
        <code className="block my-3 p-4 text-[13px] leading-relaxed overflow-x-auto whitespace-pre-wrap font-bold" style={{ background: "#1a1a1a", color: "#e0e0d8", fontFamily: "'JetBrains Mono', 'Consolas', monospace" }} {...props}>{children}</code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre className="my-0" style={{ fontFamily: "'JetBrains Mono', 'Consolas', monospace" }} {...props}>{children}</pre>
    ),

    // ── Tables ─────────────────────────────────────────────────
    table: ({ children, ...props }) => (
      <div className="my-4 overflow-x-auto border" style={{ borderColor: "#d4d4cc" }}>
        <table className="w-full text-[14px]" style={{ fontFamily: FONT, borderCollapse: "collapse" }} {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead style={{ background: "#1a1a1a", color: "#fff" }} {...props}>{children}</thead>
    ),
    th: ({ children, ...props }) => (
      <th className="px-3 py-2 text-left text-[12px] font-black uppercase tracking-[0.06em]" style={{ fontFamily: FONT, borderBottom: "2px solid #1a1a1a" }} {...props}>{children}</th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-3 py-2 border-b font-bold" style={{ borderColor: "#d4d4cc", fontFamily: FONT }} {...props}>{children}</td>
    ),
    tr: ({ children, ...props }) => (
      <tr className="even:bg-[#f8f8f4]" {...props}>{children}</tr>
    ),

    // ── Horizontal rule ────────────────────────────────────────
    hr: (props) => (
      <hr className="my-6 border-0 h-px" style={{ background: "#d4d4cc" }} {...props} />
    ),

    // ── Links ──────────────────────────────────────────────────
    a: ({ children, href, ...props }) => (
      <a href={href} target="_blank" rel="noopener" className="underline underline-offset-2 font-black" style={{ color: "#4a7ab5" }} {...props}>{children}</a>
    ),

    // ── Images ─────────────────────────────────────────────────
    img: ({ src, alt, ...props }: any) => (
      <img src={src} alt={alt} className="my-3 max-w-full border" style={{ borderColor: "#d4d4cc" }} {...props} />
    ),
  };

  // ── Zettelkasten: pre-procesar IDs y enlaces ─────────────────
  const processedContent = mode === "zettelkasten"
    ? content
        // Highlight note IDs like 20260713215654
        .replace(/\b(\d{14})\b/g, '`$1`')
        // Highlight [[links]]
        .replace(/\[\[([^\]]+)\]\]/g, '**⟐ $1**')
    : content;

  return (
    <div style={{ fontFamily: FONT }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
