import sys, os; sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from catalyst.crypto.signatures import ECDSAKeyPair


def test_sign_verify():
    kp = ECDSAKeyPair.generate()
    msg = b"data"
    sig = kp.sign(msg)
    assert kp.verify(sig, msg)
