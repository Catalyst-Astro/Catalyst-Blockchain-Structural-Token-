"""Simple multisignature transaction implementation."""

from dataclasses import dataclass
from hashlib import sha256
from typing import List

from .wallet import Wallet


@dataclass
class Transaction:
    sender: str
    recipient: str
    amount: int

    def serialize(self) -> bytes:
        return f"{self.sender}:{self.recipient}:{self.amount}".encode()


class MultisigWallet:
    """A wallet that requires multiple signatures to authorize a transaction."""

    def __init__(self, wallets: List[Wallet], required_signatures: int):
        if required_signatures > len(wallets):
            raise ValueError("Required signatures exceeds number of wallets")
        self.wallets = wallets
        self.required_signatures = required_signatures
        self.addresses = [w.address() for w in wallets]

    def sign_transaction(self, tx: Transaction, signers: List[Wallet]):
        if len(signers) < self.required_signatures:
            raise ValueError("Not enough signers")

        message = sha256(tx.serialize()).digest()
        signatures = []
        for w in signers:
            signatures.append(w.sign(message))
        return signatures

    def verify_transaction(self, tx: Transaction, signatures: List[bytes]) -> bool:
        if len(signatures) < self.required_signatures:
            return False
        message = sha256(tx.serialize()).digest()
        valid = 0
        for sig, wallet in zip(signatures, self.wallets):
            if Wallet.verify(message, sig, wallet.verifying_key):
                valid += 1
        return valid >= self.required_signatures
