import json

from narrative_memory.story_ledger import StoryLedger


def test_log_action(tmp_path):
    tmp_file = tmp_path / "ledger.jsonl"
    ledger = StoryLedger(str(tmp_file))
=======
import os
from tempfile import NamedTemporaryFile
import pytest
from narrative_memory.story_ledger import StoryLedger



def test_log_action(tmp_path):
    tmp_file = tmp_path / "ledger.jsonl"
    ledger = StoryLedger(str(tmp_file))
=======
< codex/desarrollar-dashboard-de-gobernanza-fractaldao
def test_log_action(tmp_path):
    tmp_file = tmp_path / "ledger.jsonl"
    ledger = StoryLedger(str(tmp_file))
=======
@pytest.fixture
def tmp_file(tmp_path):
    """Return temporary filename for the ledger."""
    return str(tmp_path / "ledger.jsonl")

def test_log_action(tmp_file):
    ledger = StoryLedger(tmp_file)


    ledger.log_action("test", "accion de prueba")
    with tmp_file.open("r", encoding="utf-8") as f:
        data = json.loads(f.readline())
    assert data["actor"] == "test"
    assert data["action"] == "accion de prueba"
    assert "timestamp" in data
