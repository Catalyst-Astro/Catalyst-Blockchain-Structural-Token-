# Catalyst GUI

Electron + Vite + React shell for Clockchain operations, the governed operator inbox, and the UI copilot surface.

## Prerequisites

- Node.js 20+
- Root dependencies and GUI dependencies installed
- Optional root `.env` with:
  - `PORT` for `backend/api/server.ts`
  - `CATALYST_API_URL` to override the Electron backend target
  - `VITE_WC_PROJECT_ID`, `VITE_SEPOLIA_RPC_URL`, `SEPOLIA_RPC_URL` for Web3 cards

## Recommended Activation Flow

1. Install dependencies:

```bash
npm run gui:install
```

2. Start backend + Electron in one command:

```bash
npm run gui:up
```

3. In another terminal, verify bridge and backend reachability:

```bash
npm run gui:doctor
```

4. Validate the production shell:

```bash
npm run gui:build
npm run gui:test:smoke
npm run gui:artifacts
```

## Ports

- Backend API: `PORT` or `4000`
- Vite dev server: `5173`
- Vite preview for smoke artifacts: `4173`

## Continuous GUI Loop

- Local iteration: `gui:up -> gui:doctor -> gui:test:smoke`
- Production check: `gui:build -> gui:artifacts -> clockchain:validate:ci`
- Zettelkasten anchor: `ZK-GUI-001`
- NTX trace anchor: `TR#GUI-001`

## Notes

- `gui:doctor` fails if the backend is not reachable at the resolved URL.
- `smoke:artifacts` is now backend-coupled: it requires a live backend, seeds real UI/operator cases, captures case-scoped screenshots, and writes `artifacts/gui/cases/<uiCaseId>/manifest.json` as the canonical GUI evidence pack.
- The UI copilot is governed: it proposes reviews and reports, but never publishes directly to `main`.
