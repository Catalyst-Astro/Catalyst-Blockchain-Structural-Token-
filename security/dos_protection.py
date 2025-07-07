"""Basic denial of service mitigation primitives.

Implements a token bucket rate limiter to throttle incoming requests and
prevent resource exhaustion attacks. This example is simplified and does
not interact with real network sockets.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field


@dataclass
class TokenBucket:
    capacity: int
    refill_rate: float  # tokens per second
    tokens: float = field(init=False)
    last_refill: float = field(init=False)

    def __post_init__(self) -> None:
        self.tokens = self.capacity
        self.last_refill = time.monotonic()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self.last_refill
        refill_amount = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + refill_amount)
        self.last_refill = now

    def consume(self, amount: int = 1) -> bool:
        """Attempt to consume tokens, returning True on success."""
        self._refill()
        if self.tokens >= amount:
            self.tokens -= amount
            return True
        return False
