'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type Version = { content: string; timestamp: number };

interface Props {
  content: string;
  onContentChange: (c: string) => void;
  onQuickAction: (action: string, selectedText?: string) => void;
  onClose: () => void;
}

export default function Canvas({ content, onContentChange, onQuickAction, onClose }: Props) {
  const [versions, setVersions] = useState<Version[]>([{ content, timestamp: Date.now() }]);
  const [vIdx, setVIdx] = useState(0);
  const [showChanges, setShowChanges] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (content !== versions[vIdx]?.content) {
      setVersions(prev => [...prev.slice(0, vIdx + 1), { content, timestamp: Date.now() }]);
      setVIdx(prev => prev + 1);
    }
  }, [content]);

  const undo = () => { if (vIdx > 0) { const n = vIdx - 1; setVIdx(n); onContentChange(versions[n].content); } };
  const redo = () => { if (vIdx < versions.length - 1) { const n = vIdx + 1; setVIdx(n); onContentChange(versions[n].content); } };

  const handleSelect = () => {
    const ta = editorRef.current;
    if (ta) { const s = ta.value.substring(ta.selectionStart, ta.selectionEnd); setSelectedText(s); }
  };

  const quickActions = [
    { label: 'Polish', action: 'polish', icon: '✨' },
    { label: 'Expand', action: 'expand', icon: '📝' },
    { label: 'Shorten', action: 'shorten', icon: '📋' },
    { label: 'Fix Bugs', action: 'fix_bugs', icon: '🐛' },
    { label: 'Add Comments', action: 'add_comments', icon: '💬' },
    { label: 'Review', action: 'review', icon: '🔍' },
    { label: 'Summarize', action: 'summarize', icon: '📊' },
  ];

  const exportFile = (fmt: string) => {
    const blob = new Blob([content], { type: fmt === 'md' ? 'text/markdown' : 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `canvas.${fmt}`; a.click();
  };

  const isCode = /function |class |import |const |let |var |```|def |print\(/.test(content);
  const lang = isCode ? (content.includes('def ') ? 'python' : content.includes('function ') ? 'javascript' : 'text') : 'text';

  return (
    <div className="flex flex-col h-full bg-[#0a0a12] border-l border-[#00ff8833]">
      {/* Canvas header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#00ff8833] bg-[#0d0d20]">
        <span className="text-sm font-bold text-[#00ff88]">📄 Canvas</span>
        {isCode && <span className="text-[10px] bg-[#00ff8811] text-[#00ff88] px-2 py-0.5 rounded-full">{lang}</span>}
        <span className="text-[10px] text-gray-500">{content.split('\n').length} lines</span>
        <div className="flex-1" />
        <div className="flex gap-1">
          <button onClick={undo} disabled={vIdx === 0} className="text-xs text-gray-400 hover:text-white disabled:opacity-20 px-1" title="Undo">↩</button>
          <button onClick={redo} disabled={vIdx >= versions.length - 1} className="text-xs text-gray-400 hover:text-white disabled:opacity-20 px-1" title="Redo">↪</button>
          <button onClick={() => setShowChanges(!showChanges)} className={`text-xs px-1 ${showChanges ? 'text-[#00ff88]' : 'text-gray-400 hover:text-white'}`} title="Show changes">🕐</button>
        </div>
        <button onClick={() => exportFile('md')} className="text-xs text-gray-400 hover:text-white px-1" title="Export MD">📥</button>
        <button onClick={onClose} className="text-gray-400 hover:text-red-400 px-1 text-lg" title="Close">×</button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-[#ffffff0a] overflow-x-auto bg-[#0d0d20]">
        {quickActions.map(a => (
          <button key={a.action}
            onClick={() => onQuickAction(a.action, selectedText)}
            className="text-[10px] text-gray-400 hover:text-white hover:bg-[#ffffff0a] px-2 py-1 rounded whitespace-nowrap transition"
            title={selectedText ? `Apply "${a.label}" to selection` : a.label}>
            {a.icon} {a.label}
          </button>
        ))}
        {selectedText && (
          <span className="text-[10px] text-[#ffaa00] px-2 py-1">
            "{selectedText.slice(0,30)}{selectedText.length > 30 ? '...' : ''}" selected
          </span>
        )}
      </div>

      {/* Canvas editor */}
      <textarea
        ref={editorRef}
        value={content}
        onChange={e => onContentChange(e.target.value)}
        onMouseUp={handleSelect}
        onKeyUp={handleSelect}
        className="flex-1 bg-transparent text-gray-200 p-4 font-mono text-sm leading-relaxed resize-none outline-none border-none w-full"
        placeholder="Canvas content will appear here..."
        spellCheck={false}
      />

      {/* Version diff */}
      {showChanges && vIdx > 0 && (
        <div className="border-t border-[#ffffff11] p-3 max-h-32 overflow-y-auto text-xs bg-[#0d0d20]">
          <div className="text-gray-500 mb-1">Changes from v{vIdx-1} → v{vIdx}:</div>
          <div className="text-gray-400">
            {versions[vIdx]?.content !== versions[vIdx-1]?.content
              ? `${Math.abs(versions[vIdx]?.content.length - versions[vIdx-1]?.content.length)} chars changed`
              : 'No changes detected'}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="px-3 py-1 border-t border-[#ffffff0a] text-[10px] text-gray-600 flex justify-between bg-[#0d0d20]">
        <span>v{vIdx+1}/{versions.length} · {lang}</span>
        <span>Canvas — BELL 13450.50</span>
      </div>
    </div>
  );
}
