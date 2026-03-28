---
id: ZK-GUI-001
domain: GUI
kind: TRACE
layer: L2-L7
nt_refs:
  - REQ-GUI-001
  - DEC-GUI-001
  - CTR-GUI-001
  - CMP-GUI-001
  - ART-GUI-APP-TSX-001
  - ART-GUI-UILAB-TSX-001
  - ART-GUI-COPILOT-TS-001
  - TST-GUI-001
  - MET-GUI-001
  - EVD-GUI-001
artifact_refs:
  - apps/catalyst-gui/src/App.tsx
  - apps/catalyst-gui/src/pages/UiLab.tsx
  - apps/catalyst-gui/README.md
  - backend/api/ai/uiCopilot.ts
test_refs:
  - apps/catalyst-gui/src/test/app.smoke.spec.tsx
  - apps/catalyst-gui/src/test/surface-states.spec.tsx
metric_refs:
  - MET-GUI-001
evidence_refs:
  - EVD-GUI-001
conflicts: []
---

# ZK-GUI-001

`GUI` formaliza la activacion y evolucion continua de la shell Electron/React como un dominio trazable de Clockchain. No es una vista aislada: conecta activacion local, smoke tests, capturas de renderer y revisiones gobernadas por el `UI copilot`.

## Nucleo

- La ruta critica GUI es `ZK -> NTX -> renderer/electron artifact -> smoke/a11y -> visual evidence`.
- La GUI debe poder activarse con un flujo reproducible de backend `Express/ts-node` y shell `Electron + Vite`.
- El `UI copilot` solo propone y documenta; no publica ni fusiona cambios directamente en `main`.

## Contrato operativo

- `gui:install`, `gui:up` y `gui:doctor` son la superficie minima de activacion.
- `test:smoke` valida `Dashboard`, `Operator`, `UI Lab` y `Settings` con bridge mockeado.
- `smoke:artifacts` genera screenshots y reportes para CI y evidencia Zettelkasten.

## Evidencia

La evidencia principal del dominio queda en `ui_reviews.jsonl`, `artifacts/gui/reports/*` y `artifacts/gui/screenshots/*`.
