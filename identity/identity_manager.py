"""Orchestrates identities, proofs and multisignature approvals."""

from typing import List

from .digital_signature import ECCIdentity, RSAIdentity
from .zk_proof import prove, verify, Proof
from .multisig_wallet import MultisigWallet, Transaction


class IdentityManager:
    """Manage a group of identities and validate actions."""

    def __init__(self, ecc_identities: List[ECCIdentity]):
        self.identities = ecc_identities
        self.wallet = MultisigWallet(self.identities, required=2)

    def create_proof(self, identity: ECCIdentity, message: bytes) -> Proof:
        return prove(identity.signing_key, message)

    def verify_proof(self, identity: ECCIdentity, message: bytes, proof: Proof) -> bool:
        return verify(identity.verifying_key, message, proof)

    def sign_and_validate(self, tx: Transaction, signers: List[ECCIdentity]):
        sigs = self.wallet.sign_transaction(tx, signers)
        return self.wallet.verify_transaction(tx, sigs)
