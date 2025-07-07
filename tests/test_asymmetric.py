import sys, os; sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from catalyst.crypto.asymmetric import RSAKeyPair


def test_rsa_encrypt_decrypt():
    kp = RSAKeyPair.generate()
    message = b"hello"
    ct = kp.encrypt(message)
    pt = kp.decrypt(ct)
    assert pt == message
