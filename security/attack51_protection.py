"""Mitigation strategies for 51% attacks.

This module provides utilities that implement a multi-signature
consensus requirement to prevent a single entity from gaining control
of the network's decision making process.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Dict, List


@dataclass
class Validator:
    """Represents a validator with a public key and voting weight."""

    id: str
    public_key: str
    weight: int


class MultiSigConsensus:
    """Simple multi-signature consensus mechanism."""

    def __init__(self, validators: List[Validator], threshold_percent: float) -> None:
        self.validators = {v.id: v for v in validators}
        self.threshold_percent = threshold_percent

    def compute_weight(self, signers: List[str]) -> int:
        """Compute total weight of signatures provided."""
        return sum(self.validators[s].weight for s in signers if s in self.validators)

    def valid_consensus(self, signers: List[str]) -> bool:
        """Check if the provided signers represent enough weight."""
        total_weight = sum(v.weight for v in self.validators.values())
        signing_weight = self.compute_weight(signers)
        return signing_weight * 100 >= total_weight * self.threshold_percent

    def sign_message(self, message: str, signer_ids: List[str]) -> str:
        """Produce a combined hash representing a multi-signature."""
        if not self.valid_consensus(signer_ids):
            raise ValueError("Not enough weight to reach consensus")
        data = message + ":" + ":".join(sorted(signer_ids))
        return hashlib.sha256(data.encode()).hexdigest()
