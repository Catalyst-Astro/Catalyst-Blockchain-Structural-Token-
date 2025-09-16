"""Generic smart contract interface for FractalManager."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from web3 import Web3


@dataclass
class ContractInterface:
    """Dynamically interact with deployed smart contracts."""

    web3: Web3
    contract: Any

    @classmethod
    def from_abi(cls, web3: Web3, address: str, abi: Sequence[dict]) -> "ContractInterface":
        return cls(web3, web3.eth.contract(address=address, abi=abi))

    def call_function(self, func_name: str, *args, tx: bool = False, private_key: str | None = None) -> Any:
        func = getattr(self.contract.functions, func_name)
        if tx:
            if private_key is None:
                raise ValueError("private_key required for transactions")
            account = self.web3.eth.account.from_key(private_key)
            built = func(*args).build_transaction({
                "from": account.address,
                "nonce": self.web3.eth.get_transaction_count(account.address),
                "gas": 3000000,
                "gasPrice": self.web3.to_wei("2", "gwei"),
            })
            signed = self.web3.eth.account.sign_transaction(built, private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
            return tx_hash.hex()
        return func(*args).call()
