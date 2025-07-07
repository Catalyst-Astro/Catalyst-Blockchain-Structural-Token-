from cbst.wallet import Wallet


def test_wallet_sign_verify():
    wallet = Wallet.generate()
    message = b"hello"
    sig = wallet.sign(message)
    assert Wallet.verify(message, sig, wallet.verifying_key)
