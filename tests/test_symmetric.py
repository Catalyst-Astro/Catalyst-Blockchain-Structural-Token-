import sys, os; sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from catalyst.crypto.symmetric import SymmetricCipher


def test_symmetric_encrypt_decrypt():
    key = SymmetricCipher.generate_key()
    cipher = SymmetricCipher(key)
    plaintext = b"secret"
    nonce, ct = cipher.encrypt(plaintext)
    result = cipher.decrypt(nonce, ct)
    assert result == plaintext
