"""Sybil attack mitigation utilities.

This module contains a simple stake-based identity system to limit the
creation of fake identities in a peer-to-peer network. Each node must
prove ownership of a minimal stake in order to participate. The stake
is tracked via cryptographically signed vouchers.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Dict


@dataclass
class StakeVoucher:
    """Represents a cryptographically signed stake voucher."""

    owner_id: str
    amount: int
    signature: str

    def verify_signature(self, public_key: str) -> bool:
        """Verify the signature using a simple hash-based scheme.

        This is a simplified example that does not implement a full
        cryptographic signature algorithm. In a production system you
        would use ECDSA, BLS or another proven signature scheme.
        """
        data = f"{self.owner_id}:{self.amount}:{public_key}".encode()
        expected = hashlib.sha256(data).hexdigest()
        return expected == self.signature


class StakeRegistry:
    """Registry of stake vouchers for nodes in the network."""

    def __init__(self, min_stake: int) -> None:
        self.min_stake = min_stake
        self._vouchers: Dict[str, StakeVoucher] = {}

    def register(self, voucher: StakeVoucher, public_key: str) -> bool:
        """Register a voucher if it meets the minimum stake requirement."""
        if voucher.amount < self.min_stake:
            return False
        if voucher.verify_signature(public_key):
            self._vouchers[voucher.owner_id] = voucher
            return True
        return False

    def has_valid_stake(self, owner_id: str) -> bool:
        """Check whether a node has a valid voucher."""
        return owner_id in self._vouchers
