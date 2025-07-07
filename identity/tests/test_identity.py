import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from identity.digital_signature import RSAIdentity, ECCIdentity
from identity.zk_proof import prove, verify
from identity.multisig_wallet import Transaction, MultisigWallet


def test_signatures():
    rsa = RSAIdentity.generate()
    ecc = ECCIdentity.generate()
    data = b"msg"
    assert rsa.verify(rsa.sign(data), data)
    assert ecc.verify(ecc.sign(data), data)


def test_zero_knowledge():
    ecc = ECCIdentity.generate()
    message = b"zk"
    proof = prove(ecc.signing_key, message)
    assert verify(ecc.verifying_key, message, proof)


def test_multisig():
    ids = [ECCIdentity.generate() for _ in range(3)]
    wallet = MultisigWallet(ids, required=2)
    tx = Transaction(sender="A", recipient="B", amount=1)
    sigs = wallet.sign_transaction(tx, ids[:2])
    assert wallet.verify_transaction(tx, sigs)
