import pytest
from pathlib import Path

@pytest.fixture
def tmp_file(tmp_path):
    file = tmp_path / "temp.jsonl"
    yield str(file)
