import json
import os
from tempfile import NamedTemporaryFile
import pytest
from narrative_memory.story_ledger import StoryLedger


@pytest.fixture
def tmp_file(tmp_path):
    """Return temporary filename for the ledger."""
    return str(tmp_path / "ledger.jsonl")

def test_log_action(tmp_file):
    ledger = StoryLedger(tmp_file)
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
