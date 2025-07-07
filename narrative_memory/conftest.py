import pytest

def pytest_configure(config):
    pass

@pytest.fixture
def tmp_file(tmp_path):
    tmp = tmp_path / "tmp_file"
    return str(tmp)
