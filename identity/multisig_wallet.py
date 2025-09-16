"""Simple 2-of-3 multisignature wallet."""

from dataclasses import dataclass
from hashlib import sha256
from typing import List

from .digital_signature import ECCIdentity


@dataclass
class Transaction:
    sender: str
    recipient: str
    amount: int

    def serialize(self) -> bytes:
        return f"{self.sender}:{self.recipient}:{self.amount}".encode()


class MultisigWallet:
    """Wallet that requires multiple ECC identities to sign."""

    def __init__(self, identities: List[ECCIdentity], required: int = 2):
        if required > len(identities):
            raise ValueError("required signatures exceeds participants")
        self.identities = identities
        self.required = required

    def sign_transaction(self, tx: Transaction, signers: List[ECCIdentity]) -> List[bytes]:
        if len(signers) < self.required:
            raise ValueError("not enough signers")
        message = sha256(tx.serialize()).digest()
        return [s.sign(message) for s in signers]

    def verify_transaction(self, tx: Transaction, signatures: List[bytes]) -> bool:
        if len(signatures) < self.required:
            return False
        message = sha256(tx.serialize()).digest()
        valid = 0
        for sig, identity in zip(signatures, self.identities):
            if identity.verify(sig, message):
                valid += 1
        return valid >= self.required
