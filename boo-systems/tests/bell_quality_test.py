#!/usr/bin/env python3
"""
BELL QUALITY TEST - 1 -> 13,450 -> 13,550 -> 1
BELL 13450.50 | Progressive training of the Boo system
"""

import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.zetelkasten.engine import DialecticalEngine
from src.zetelkasten.memory import BlockMemory
from src.zetelkasten.commands import CommandParser
from src.zetelkasten.validators import HybrysDetector
from src.boo.pipeline import ValidationPipeline
from src.boo.confidence_manager import ConfidenceManager
from src.boo.notifications import NotificationSystem

def run_round(n, name):
    engine = DialecticalEngine()
    memory = BlockMemory()
    parser = CommandParser(engine, memory)
    pipeline = ValidationPipeline()
    cm = ConfidenceManager(initial_confidence=7.0)
    t0 = time.time()
    ok = 0; fail = 0; hyb = 0; errs = 0; confs = 0

    for i in range(n):
        try:
            engine.process_thesis(f"T_{name}_{i}: Optimizar pulso para celula {i%20}")
            engine.process_antithesis(f"A_{name}_{i}: Frecuencia {350+(i%200)} THz genera estres termico")
            engine.process_synthesis(f"S_{name}_{i}: Pulso bifasico {220+(i%100)}+{350+(i%200)} THz modulado")

            result = pipeline.validate(
                f"Pulso bifasico celula {i%20}: prep {220+(i%100)} THz, "
                f"principal {350+(i%200)} THz, amp {30+(i%50)}%"
            )

            if result.validated: ok += 1; cm.record_success("ok")
            else: fail += 1; cm.record_failure("fail")

            engine.current_block.compute_seal()
            memory.save_block(engine.current_block)
            confs += cm.state.current

        except Exception as e:
            errs += 1
            if "HYBRIS" in str(e).upper() or "Hybris" in str(e): hyb += 1
            engine.process_reset(str(e)[:100])

    elapsed = time.time() - t0
    total = ok + fail
    return {
        "name": name, "n": n, "ok": ok, "fail": fail,
        "rate": round(ok/total*100,2) if total else 0,
        "hybris": hyb, "errors": errs,
        "confidence": round(confs/max(n,1), 2),
        "time": round(elapsed, 2),
        "speed": round(n/elapsed, 1) if elapsed else 0,
        "integrity": memory.verify_chain().get("integrity", memory.verify_chain().get("status", "UNKNOWN")),
    }

def run_full_test():
    print()
    print("=" * 60)
    print("  BELL QUALITY TEST - Boo System Training")
    print("=" * 60)
    print()

    rounds_config = [
        (1, "SEMILLA"),
        (13450, "BELL_CORE"),
        (13550, "BELL_STRESS"),
        (1, "CIERRE"),
    ]

    results = []
    for n, name in rounds_config:
        icon = {1: "seedling", 13450: "leaf", 13550: "tree", 1: "trophy"}.get(n, "target")
        print(f"  [{icon}] Round: {name} ({n:,} simulations)...", end=" ", flush=True)
        r = run_round(n, name)
        results.append(r)
        print(f"Done. {r['speed']} sims/s | Validation: {r['rate']}% | Chain: {r['integrity']}")
        if n > 1000:
            print(f"       Hybris: {r['hybris']} | Confidence: {r['confidence']} | Time: {r['time']}s")

    # Interpretation
    total = sum(r["n"] for r in results)
    total_ok = sum(r["ok"] for r in results)
    total_fail = sum(r["fail"] for r in results)
    total_hybris = sum(r["hybris"] for r in results)
    total_time = sum(r["time"] for r in results)

    # BELL Score
    bell_score = (total_ok / max(total, 1)) * 100 * (1 - total_hybris / max(total, 1))
    grade = "BELL 13450.50 CERTIFIED" if bell_score > 80 else \
            "BELL 10000 PASS" if bell_score > 60 else \
            "BELL 5000 - Needs improvement" if bell_score > 40 else "BELL FAIL"

    print()
    print("=" * 60)
    print("  BELL QUALITY REPORT")
    print("=" * 60)
    print(f"""
  Total simulations:    {total:>12,}
  Total time:           {total_time:>12.1f}s
  Average speed:        {total/total_time:>12.1f} sims/s

  Validated syntheses:  {total_ok:>12,} ({total_ok/total*100:>5.1f}%)
  Rejected syntheses:   {total_fail:>12,} ({total_fail/total*100:>5.1f}%)
  Hybris events:        {total_hybris:>12,}

  Chain integrity:      {str(results[-1].get('integrity', '?')):>12s}
  Final confidence:     {results[-1]['confidence']:>12.2f}/10

  BELL Score:           {bell_score:>12.2f}
  Grade:                 {grade}
""")

    # Knowledge acquired
    print("  [Brain] Knowledge acquired:")
    print(f"  - After {total:,} cycles, the engine processed:")
    print(f"    {total_ok:,} validated syntheses (confirmed knowledge)")
    print(f"    {total_fail:,} rejected syntheses (falsified hypotheses)")
    print(f"    {total_hybris:,} Hybris events (safety resets)")
    hybris_rate = total_hybris / total * 100 if total else 0
    print(f"  - Hybris rate: {hybris_rate:.2f}% ({'HEALTHY' if hybris_rate < 5 else 'ELEVATED - recalibrate'})")

    # Phase comparison
    if len(results) >= 3:
        drift = abs(results[1]["rate"] - results[2]["rate"])
        print(f"  - Validation stability: {drift:.2f}% drift ({'STABLE' if drift < 5 else 'UNSTABLE'})")

    print()
    print(f"  Final Grade: {grade}")
    print("=" * 60)

    return results, bell_score, grade

if __name__ == "__main__":
    run_full_test()
