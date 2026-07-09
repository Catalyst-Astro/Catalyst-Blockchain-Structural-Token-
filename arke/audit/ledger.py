from __future__ import annotations

import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

import jwt

from arke.settings import get_settings


class AuditLedger:
    """Simple append-only JSONL ledger with hash chaining and JWS signatures."""

    def __init__(self, path: str | None = None, secret: str | None = None) -> None:
        settings = get_settings()
        self.path = Path(path or settings.AUDIT_LEDGER_FILE)
        self.secret = secret or settings.AUDIT_SECRET
        self.path.touch(exist_ok=True)

    def _last_hash(self) -> str:
        last = ""
        with self.path.open("r", encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    data = json.loads(line)
                    last = data.get("hash", "")
        return last

    def append(self, action: str, data: Dict[str, Any]) -> None:
        prev_hash = self._last_hash()
        payload = {
            "ts": datetime.utcnow().isoformat(),
            "action": action,
            "data": data,
            "prev_hash": prev_hash,
        }
        content = json.dumps(payload, sort_keys=True).encode()
        current_hash = hashlib.sha256(content).hexdigest()
        payload["hash"] = current_hash
        token = jwt.encode(payload, self.secret, algorithm="HS256")
        entry = {**payload, "signature": token}
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")

    def verify(self) -> bool:
        prev_hash = ""
        with self.path.open("r", encoding="utf-8") as fh:
            for line in fh:
                if not line.strip():
                    continue
                record = json.loads(line)
                signature = record.get("signature")
                body = {k: record[k] for k in record if k != "signature"}
                try:
                    decoded = jwt.decode(signature, self.secret, algorithms=["HS256"])
                except Exception:
                    return False
                if decoded != body:
                    return False
                content = json.dumps({k: body[k] for k in body if k != "hash"}, sort_keys=True).encode()
                current_hash = hashlib.sha256(content).hexdigest()
                if body.get("prev_hash") != prev_hash or body.get("hash") != current_hash:
                    return False
                prev_hash = current_hash
        return True


def cli() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Manage audit ledger")
    parser.add_argument("command", choices=["verify"], help="Action to perform")
    args = parser.parse_args()

    ledger = AuditLedger()
    if args.command == "verify":
        ok = ledger.verify()
        print("OK" if ok else "CORRUPTED")
