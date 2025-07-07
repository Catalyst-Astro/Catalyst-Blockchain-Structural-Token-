"""Command line demonstration for the structural token package."""
import os
from structural_token.wallet import Wallet, MultiSigWallet
from structural_token.identity import Identity
from structural_token.blind_signature import RSABlindSigner, RSABlindSignatureProtocol


def demo_identity_proof():
    print("== Identity Zero-Knowledge Proof Demo ==")
    identity = Identity.generate()
    message = b"Authenticate"
    proof = identity.prove_knowledge(message)
    valid = identity.verify_knowledge(message, proof)
    print("Proof valid:", valid)


def demo_multisig():
    print("== Multisignature Wallet Demo ==")
    wallets = [Wallet.generate() for _ in range(3)]
    msig = MultiSigWallet(wallets, threshold=2)
    tx = b"transfer 100 tokens"
    signatures = msig.sign(tx)
    # only require first two signatures
    valid = msig.verify(tx, signatures[:2])
    print("Transaction valid with 2 signatures:", valid)


def demo_blind_sign():
    print("== RSA Blind Signature Demo ==")
    signer = RSABlindSigner()
    protocol = RSABlindSignatureProtocol(signer.public_key)
    message = 42
    r = 5  # normally random and coprime with n
    blinded = protocol.blind(message, r)
    signed_blind = signer.sign(blinded)
    signature = protocol.unblind(signed_blind, r)
    print("Signature valid:", protocol.verify(message, signature))


if __name__ == "__main__":
    demo_identity_proof()
    demo_multisig()
    demo_blind_sign()
