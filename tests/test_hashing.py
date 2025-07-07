import sys, os; sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from catalyst.crypto.hashing import sha256, pbkdf2


def test_sha256():
    data = b"abc"
    digest = sha256(data)
    assert isinstance(digest, bytes) and len(digest) == 32


def test_pbkdf2():
    password = b"password"
    key, salt = pbkdf2(password)
    key2, _ = pbkdf2(password, salt)
    assert key == key2
