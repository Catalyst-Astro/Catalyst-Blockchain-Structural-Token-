import pytest

from pathlib import Path

@pytest.fixture
def tmp_file(tmp_path):
    file = tmp_path / "temp.jsonl"
    yield str(file)
=======

def pytest_configure(config):
    pass

@pytest.fixture
def tmp_file(tmp_path):
    tmp = tmp_path / "tmp_file"
    return str(tmp)

