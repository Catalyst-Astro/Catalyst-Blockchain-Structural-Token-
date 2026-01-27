# AGENTS — Catalyst Desktop GUI

## Stack & Tooling
- Electron + Vite + React + TypeScript
- Styling: Tailwind CSS + CSS variables (design tokens) with light/dark themes
- Icons: lucide-react
- Testing/lint: hardhat tests remain; lint placeholder until wired

## Commands
- Install: `npm install`
- Dev (Electron window + Vite): `npm run dev`
- Build renderer + electron bundle: `npm run build`
- Lint placeholder: `npm run lint`

## Conventions
- One component per file under `src/renderer/components/*`
- Responsive/mobile-first; desktop scales up
- Accessibility: `aria-*`, keyboard focus via `:focus-visible` styles
- Required view states: loading, empty, error for primary screens
- Avoid inline styles; prefer Tailwind + CSS vars
- Micro-interactions: hover/active/focus transitions ~150–200ms

## Design Tokens (CSS variables)
Light and dark variants defined in `globals.css`:
- `--bg`, `--fg`, `--card`, `--muted`, `--border`
- `--primary`, `--primary-foreground`, `--radius`

## Spacing & Typography
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 px
- Body sizes: 14 / 16 / 18 px
- Headings: 24 / 32 / 40 px

## Layout Skeleton
```
/electron/main.ts
/electron/preload.ts
/src/renderer/main.tsx
/src/renderer/App.tsx
/src/renderer/styles/globals.css
/src/renderer/components/ui/*
/src/renderer/components/layout/*
/src/renderer/pages/Dashboard.tsx
```

## Electron Security Defaults
- `contextIsolation: true`, `nodeIntegration: false`
- Use preload + `contextBridge`
- Restrict navigation to trusted URLs only
