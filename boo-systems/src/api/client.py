#!/usr/bin/env python3
"""Boo API Client — Python SDK (#037)"""
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass


@dataclass
class BooClient:
    """Python client for the Boo Systems API."""

    base_url: str = "http://localhost:8000"
    api_key: str = "boo-dev-key-2026"
    timeout: int = 30

    def _headers(self) -> Dict:
        return {"X-API-Key": self.api_key, "Content-Type": "application/json"}

    def process(self, text: str) -> Dict:
        r = requests.post(f"{self.base_url}/process", json={"text": text},
                          headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def status(self) -> Dict:
        r = requests.get(f"{self.base_url}/status", headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def blocks(self, limit: int = 10) -> Dict:
        r = requests.get(f"{self.base_url}/blocks", params={"limit": limit},
                         headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def get_block(self, block_id: str) -> Dict:
        r = requests.get(f"{self.base_url}/blocks/{block_id}",
                         headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def simulate(self, synthesis: str, params: Dict = None) -> Dict:
        r = requests.post(f"{self.base_url}/simulate",
                          json={"synthesis": synthesis, "params": params or {}},
                          headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def metrics(self) -> Dict:
        r = requests.get(f"{self.base_url}/metrics", headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def verify_chain(self) -> Dict:
        r = requests.get(f"{self.base_url}/chain/verify", headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def notifications(self, limit: int = 20) -> Dict:
        r = requests.get(f"{self.base_url}/notifications", params={"limit": limit},
                         headers=self._headers(), timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def health(self) -> Dict:
        r = requests.get(f"{self.base_url}/health", timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    # Convenience methods matching CLI commands
    def tesis(self, text: str) -> Dict:
        return self.process(f"!tesis {text}")

    def contra(self, text: str) -> Dict:
        return self.process(f"!contra {text}")

    def sintetiza(self, text: str = "") -> Dict:
        return self.process(f"!sintetiza {text}" if text else "!sintetiza")

    def forward(self, action: str) -> Dict:
        return self.process(f"!forward {action}")

    def reward(self, score: float) -> Dict:
        return self.process(f"!reward {score}")

    def reset(self, lesson: str = "") -> Dict:
        return self.process(f"!reset {lesson}" if lesson else "!reset")


# ── Example usage ──
if __name__ == "__main__":
    client = BooClient()
    print("Boo Systems API Client")
    print(f"  Health: {client.health()}")
    print(f"  Status: {client.status()}")
    print(f"  Process: {client.tesis('El universo es fractal')}")
