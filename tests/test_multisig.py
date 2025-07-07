from cbst.wallet import Wallet
from cbst.multisig import Transaction, MultisigWallet


def test_multisig_transaction():
    wallets = [Wallet.generate() for _ in range(3)]
    msw = MultisigWallet(wallets, required_signatures=2)
    tx = Transaction(sender=wallets[0].address(), recipient="B", amount=10)

    sigs = msw.sign_transaction(tx, wallets[:2])
    assert msw.verify_transaction(tx, sigs)
