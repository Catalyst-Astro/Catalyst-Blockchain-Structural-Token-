import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


class StoryLedger:
    """Ledger that stores narrative actions as stories."""

    def __init__(self, filename: str = "narrative_ledger.jsonl"):
        self.filepath = Path(filename)
        # Ensure the file exists
        self.filepath.touch(exist_ok=True)

    def log_action(self, actor: str, action: str, context: Optional[Dict[str, Any]] = None) -> None:
        """Log a narrative action by appending it as JSON."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor": actor,
            "action": action,
        }
        context = context or {}
        for key in ("traceId", "reqId", "ctrId", "caseId", "eid", "status"):
            value = context.get(key)
            if value:
                entry[key] = value

        for key in ("vids", "zkRefs", "evidenceRefs"):
            value = context.get(key)
            if isinstance(value, list):
                normalized = sorted({str(item).strip() for item in value if str(item).strip()})
                if normalized:
                    entry[key] = normalized

        with self.filepath.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def stories(self):
        """Yield stories from the ledger."""
        with self.filepath.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    yield json.loads(line)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Narrative memory ledger")
    parser.add_argument("actor", help="Nombre del actor")
    parser.add_argument("action", help="Descripción de la acción")
    parser.add_argument(
        "--file",
        default="narrative_ledger.jsonl",
        help="Archivo del libro mayor para almacenar historias",
    )
    args = parser.parse_args()

    ledger = StoryLedger(args.file)
    ledger.log_action(args.actor, args.action)
    print(f"Historia agregada al libro mayor {args.file}")
