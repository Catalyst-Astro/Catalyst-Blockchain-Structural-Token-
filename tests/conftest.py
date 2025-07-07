import os
import sys
import pytest

# Ensure src is on path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))


@pytest.fixture
def tmp_file(tmp_path):
    """Provide a temporary file path for tests that require one."""
    file = tmp_path / "temp.jsonl"
    yield str(file)
=======
import pytest

from tempfile import NamedTemporaryFile


@pytest.fixture
def tmp_file(tmp_path):

    """Return a temporary file path for tests expecting a string path."""
    tmp = tmp_path / "tmp_file"
    return str(tmp)
=======
    """Temporary file path for ledger tests."""
    return str(tmp_path / "ledger.jsonl")


