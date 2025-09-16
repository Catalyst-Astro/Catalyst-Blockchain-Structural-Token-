import pytest
from pathlib import Path


@pytest.fixture
def tmp_file(tmp_path):
    return str(tmp_path / "temp.jsonl")
