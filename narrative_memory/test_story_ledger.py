import json
from narrative_memory.story_ledger import StoryLedger


def test_log_action(tmp_path):
    tmp_file = tmp_path / "ledger.jsonl"
    ledger = StoryLedger(str(tmp_file))
    ledger.log_action("test", "accion de prueba")
    with tmp_file.open("r", encoding="utf-8") as f:
        data = json.loads(f.readline())
    assert data["actor"] == "test"
    assert data["action"] == "accion de prueba"
    assert "timestamp" in data
