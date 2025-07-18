import os
import sys
import pytest

# Ensure src is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))


@pytest.fixture
def tmp_file(tmp_path):
    """Return a temporary file path for tests expecting a string path."""
    return str(tmp_path / "ledger.jsonl")
