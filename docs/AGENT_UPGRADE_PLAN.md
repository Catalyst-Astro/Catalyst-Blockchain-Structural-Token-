# 🔧 PLAN DE ACTUALIZACIÓN — Pentetraktys CLI → Nivel Codex+

**Fecha:** 2026-08-09
**Rama:** `feat/agent-equipe-codex`
**Estándar:** BELL 13450.50
**Modelo:** Pentetraktys 4D + Zettelkasten Vectorial

---

## 📋 RESUMEN EJECUTIVO DE BRECHAS (verificado empíricamente)

| Brecha verificada | Evidencia | Competidor que lo tiene |
|---|---|---|
| **Sin loop de corrección automática** (build → error → fix) | `api/chat/route.ts` hace 1 tool loop simple, sin re-ejecución de build | Codex (modo agent) |
| **Sin herramientas de test/build** | registry.ts solo tiene 10 tools (file+shell+git) | Codex, Cline |
| **Sin plan / "pending changes"** | executor.ts aplica ediciones inmediatas | Claude Code, Cline |
| **Sin memoria persistente entre sesiones** | No hay `ZK_INDEX.md` ni sistema de notas versionado | Claude Code (`.claude`), Codex (`AGENTS.md`) |
| **Timeouts fijos** (120s máx, bash) | guard.ts `COMMAND_TIMEOUT_MS = 120_000` | Codex permite procesos largos/background |
| **Sandbox restringido al cwd** | `resolveProjectPath` bloquea `../` | Codex/Cline navegan monorepo |
| **Máx 15 tool calls/request** | guard.ts `MAX_TOOL_CALLS_PER_REQUEST = 15` | Codex ejecuta decenas |
| **Sin tool de "consulta web"** | No existe en registry | Cline (MCP) |
| **Sin tool de "plan" o "costo"** | No hay presupuesto de tokens/tiempo | Codex muestra costo/tiempo por acción |

---

## BLOQUE 1 — FUNDAMENTOS DEL MOTOR (P0 — crítico primero)

### ✅ TAREA 1.1 — `run_build` y error-fixing loop automático
- **Archivos:** `src/tools/registry.ts`, `src/tools/executor.ts`, `src/app/api/chat/route.ts`
- **Resultado:** Agente puede "construir → ver error → parchear → reconstruir" solo

### ✅ TAREA 1.2 — `run_test` y soporte multi-comando
- **Archivos:** `src/tools/registry.ts`, `src/tools/executor.ts`
- **Resultado:** Agente puede validar su propio trabajo (TDD)

### ✅ TAREA 1.3 — `plan` / sesión multipaso con "pending changes"
- **Archivos:** `src/tools/registry.ts`, `src/app/api/chat/route.ts`
- **Resultado:** El agente planifica cambios y el usuario aprueba el batch

### ✅ TAREA 1.4 — `zk_query` : consulta a memoria Zettelkasten persistente
- **Archivos:** `src/tools/registry.ts`, `src/tools/executor.ts`, `docs/zettelkasten/`
- **Resultado:** Memoria de largo plazo entre sesiones

---

## BLOQUE 2 — SEGURIDAD Y CONTROL AVANZADO (P1)

### TAREA 2.1 — `web_fetch` para consulta de documentación externa
### TAREA 2.2 — `preflight_plan` / presupuesto de operación
### TAREA 2.3 — `git_commit` seguro y `git_revert` con confirmación

---

## BLOQUE 3 — SUPERPODERES DE CATALYST (P2 — diferenciadores)

### TAREA 3.1 — Modo Pentetraktys integrado al plan de tarea
### TAREA 3.2 — Grafo Zettelkasten visual en la UI
### TAREA 3.3 — `hybrys` auto-detección en tool calls

---

## BLOQUE 4 — ESCALABILIDAD Y MONOREPO (P2-P3)

### TAREA 4.1 — Soporte multi-cwd (entrar a subcarpetas)
### TAREA 4.2 — Herramienta `agent` empaquetada como librería
### TAREA 4.3 — Costo y límite dinámico

---

## 🏆 TABLA COMPARATIVA POST-ACTUALIZACIÓN

| Capacidad | Codex | Claude Code | Cline | **Pentetraktys CLI (después)** |
|---|---|---|---|---|
| Loop auto-corrección | ✅ | ✅ | ⚠️ | ✅ (1.1) |
| Tests automáticos | ✅ | ✅ | ✅ | ✅ (1.2) |
| Pending changes | ✅ | ✅ | ✅ | ✅ (1.3) |
| Memoria persistente | ❌ | ✅ `.claude` | ⚠️ | ✅ **ZK profundidad** (1.4) |
| Multi-cwd monorepo | ⚠️ | ✅ | ✅ | ✅ (4.1) |
| Consulta web docs | ⚠️ | ✅ | ✅ | ✅ (2.1) |
| Plan con costo | ✅ | ✅ | ❌ | ✅ (2.2) |
| Control git avanzado | ✅ | ✅ | ✅ | ✅ (2.3) |
| **Razonamiento Pentetraktys** | ❌ | ❌ | ❌ | ✅ **ÚNICO** (3.1) |
| **Grafo Zettelkasten visual** | ❌ | ❌ | ❌ | ✅ **ÚNICO** (3.2) |
| **Auto-detección Hybrys** | ❌ | ❌ | ❌ | ✅ **ÚNICO** (3.3) |
| Límites dinámicos | ✅ | ✅ | ❌ | ✅ (4.3) |

---

> **OSHIRO (大城):** The great castle that builds itself.
> **Autopoiesis:** Financial self-creation.
