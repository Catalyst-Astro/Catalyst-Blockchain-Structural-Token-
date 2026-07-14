import { create } from 'zustand';

type Mode = 'catalyst' | 'pentetraktys' | 'boo' | 'zettelkasten';
type Depth = 'surface' | 'medium' | 'deep' | 'frontier';
type ThinkingLevel = 'off' | 'high' | 'max';

interface AppState {
  mode: Mode; setMode: (m: Mode) => void;
  depth: Depth; setDepth: (d: Depth) => void;
  thinking: ThinkingLevel; setThinking: (t: ThinkingLevel) => void;
  theme: 'dark' | 'light'; toggleTheme: () => void;
  sidebarOpen: boolean; toggleSidebar: () => void;
  canvasOpen: boolean; setCanvasOpen: (o: boolean) => void;
  research: boolean; toggleResearch: () => void;
  webSearch: boolean; toggleWebSearch: () => void;
}

export const useStore = create<AppState>((set) => ({
  mode: 'catalyst', setMode: (mode) => set({ mode }),
  depth: 'surface', setDepth: (depth) => set({ depth }),
  thinking: 'off', setThinking: (thinking) => set({ thinking }),
  theme: 'dark', toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  sidebarOpen: true, toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  canvasOpen: false, setCanvasOpen: (canvasOpen) => set({ canvasOpen }),
  research: false, toggleResearch: () => set(s => ({ research: !s.research })),
  webSearch: false, toggleWebSearch: () => set(s => ({ webSearch: !s.webSearch })),
}));
