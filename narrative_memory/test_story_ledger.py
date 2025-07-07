import json
import os
from tempfile import NamedTemporaryFile
from narrative_memory.story_ledger import StoryLedger


def test_log_action(tmp_path):
    tmp_file = tmp_path / "ledger.jsonl"
    ledger = StoryLedger(str(tmp_file))
    ledger.log_action("test", "accion de prueba")
    with open(tmp_file, "r", encoding="utf-8") as f:
        data = json.loads(f.readline())
    assert data["actor"] == "test"
    assert data["action"] == "accion de prueba"
    assert "timestamp" in data

if __name__ == "__main__":
    with NamedTemporaryFile(delete=False) as tmp:
        tmp_name = tmp.name
    try:
        test_log_action(tmp_name)
        print("Tests passed")
    finally:
        os.remove(tmp_name)
