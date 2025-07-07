import os
import sys

# Ensure src is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

import pytest


@pytest.fixture
def tmp_file(tmp_path):
    """Temporary file path for ledger tests."""
    return str(tmp_path / "ledger.jsonl")
