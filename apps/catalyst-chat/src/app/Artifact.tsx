'use client';

import { useState } from 'react';

interface Props { code: string; lang?: string; }

export default function Artifact({ code, lang }: Props) {
  const [open, setOpen] = useState(false);

  const isHTML = lang === 'html' || code.includes('<!DOCTYPE') || code.includes('<html') ||
    (code.includes('<div') && code.includes('</div>'));
  const isJSX = code.includes('export default') || code.includes('function App');

  if (!isHTML && !isJSX) return null;

  return (
    <div className="mt-2 border border-[#00ff8833] rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0d20] border-b border-[#00ff8833]">
        <span className="text-xs text-[#00ff88]">📦 Artifact</span>
        <span className="text-[10px] text-gray-500">{lang || 'html'}</span>
        <div className="flex-1" />
        <button onClick={() => setOpen(!open)}
          className="text-xs text-gray-400 hover:text-white">{open ? 'Hide' : 'Preview'}</button>
      </div>
      {open && (
        <iframe sandbox="allow-scripts" srcDoc={code}
          className="w-full h-96 bg-white border-0" title="Artifact preview" />
      )}
    </div>
  );
}
