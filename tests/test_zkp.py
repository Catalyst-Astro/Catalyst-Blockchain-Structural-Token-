from cbst.wallet import Wallet
from cbst import zkp


def test_schnorr_proof():
    wallet = Wallet.generate()
    message = b"identity"
    proof = zkp.prove(wallet.signing_key, message)
    assert zkp.verify(wallet.verifying_key, message, proof)
