#!/usr/bin/env python3
"""
Boo Systems — Interactive CLI
══════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D

Interactive command-line interface for the Zettelkasten dialectical engine.
Start with: python -m boo_systems.src.api.cli
"""

import sys, os, io, json, traceback
from datetime import datetime

# Fix encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add parent path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.zetelkasten.engine import DialecticalEngine
from src.zetelkasten.memory import BlockMemory
from src.zetelkasten.commands import CommandParser
from src.zetelkasten.validators import HybrysDetector


def banner():
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  🧠 BOO SYSTEMS — ZETTELKASTEN + PENTETRAKTYS 4D ENGINE    ║")
    print("║  BELL 13450.50 | Blockchain Structural Memory               ║")
    print("║  TESIS → ANTITESIS → SINTESIS → CONCLUSION → HYBRYS → RESET ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()


def main():
    engine = DialecticalEngine()
    memory = BlockMemory()
    parser = CommandParser(engine, memory)
    detector = HybrysDetector()

    banner()

    # Load existing chain
    existing = memory.count()
    if existing > 0:
        print(f"  📦 {existing} bloques cargados de memoria.")
        chain = memory.verify_chain()
        print(f"  🔐 Integridad: {chain['integrity']} ({chain['valid']}/{chain['total']} válidos)")
    else:
        print("  🌱 Sin bloques previos. Escribe tu primera !tesis para comenzar.")

    print()
    print("  Escribe !help para ver comandos. Ctrl+C para salir.")
    print()

    while True:
        try:
            phase = engine.phase.value.upper()
            hyb = engine.hybris_score
            status = "🔴" if hyb > 0.15 else "🟡" if hyb > 0.05 else "🟢"
            prompt = f"  [{status} {phase}] > "

            user_input = input(prompt).strip()
            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit", "salir"):
                # Seal and save current block
                if engine.current_block:
                    engine.current_block.compute_seal()
                    memory.save_block(engine.current_block)
                print(f"\n  👋 {memory.count()} bloques guardados. ¡Hasta luego!\n")
                break

            result = parser.parse(user_input)

            if result.get("msg"):
                print(f"  {result['msg']}")

            if result.get("hybrys", {}).get("reset_required"):
                print(f"  🚨 HYBRYS CRÍTICO — El sistema requiere !reset")
                print(f"  Escribe !reset <lección aprendida>")

            # Auto-seal on phase transitions
            if result.get("action") in ("forward", "reset", "reward"):
                if engine.current_block:
                    memory.save_block(engine.current_block)

            print()

        except KeyboardInterrupt:
            if engine.current_block:
                engine.current_block.compute_seal()
                memory.save_block(engine.current_block)
            print(f"\n\n  👋 {memory.count()} bloques guardados.\n")
            break
        except Exception as e:
            print(f"  ❌ Error: {e}")
            traceback.print_exc()


if __name__ == "__main__":
    main()
