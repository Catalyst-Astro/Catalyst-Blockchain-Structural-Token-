# 🧠 Boo Systems — Zettelkasten + Pentetraktys 4D AI Engine

**BELL 13450.50** | Dialectical Intelligence with Blockchain Memory

---

## What is Boo?

Boo is a **dialectical AI engine** that processes knowledge through the Pentetraktys 5-phase cycle:

```
TESIS → ANTITESIS → SINTESIS → CONCLUSION → HYBRYS → RESET
```

Each cycle is stored as an **immutable block** — a "blockchain of knowledge" where every idea, counter-argument, synthesis, and lesson learned is permanently recorded with SHA-256 seals.

---

## Architecture

```
boo-systems/
├── src/
│   ├── zettelkasten/       # 🧠 Cognitive Engine
│   │   ├── engine.py       # Pentetraktys 5-phase state machine
│   │   ├── commands.py     # !tesis, !contra, !sintetiza, !forward, !reward, !reset
│   │   ├── memory.py       # Block storage (JSON blockchain)
│   │   └── validators.py   # Hybrys detection + input validation
│   ├── boo/                # 🧬 Physics Simulator
│   │   ├── compiler.py     # Path integrator
│   │   └── orchestrator.py # Bridge: Zettelkasten ↔ Simulation
│   ├── core/               # ⚙️ Constants + exceptions
│   ├── api/                # 🌐 CLI + REST endpoints
│   └── utils/              # 🔧 Tools
├── tests/                  # ✅ Unit tests
├── configs/                # ⚙️ YAML configuration
└── data/zettel_blocks/     # 📦 Immutable block storage
```

---

## Quick Start

```bash
cd boo-systems
python -m src.api.cli
```

## Commands

| Command | Purpose |
|---|---|
| `!tesis <texto>` | Submit a thesis (P1: Top-Down) |
| `!contra <texto>` | Submit an antithesis (P2: Bottom-Up) |
| `!sintetiza` | Generate synthesis (P3) |
| `!forward <acción>` | Declare executable action (P4) |
| `!reward <0-10>` | Evaluate cycle (triggers Hybrys check) |
| `!reset <lección>` | Reset from Hybrys with lesson learned |
| `!state` | Show current engine state |
| `!chain [n]` | Show last n blocks |

## The Golden Rule (Hybrys Detection)

```
If CONFIDENCE > 0.8 AND REWARD < 0.4:
    → HYBRYS TRIGGERED
    → Forced RESET with lesson learned
```

## License

Apache 2.0 — Catalyst Blockchain Labs S.A. de C.V.
