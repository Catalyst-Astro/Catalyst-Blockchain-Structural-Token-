"""Token management utilities for FractalManager."""
from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv
from web3 import Web3


load_dotenv()

RPC_URL = os.getenv("RPC_URL", "http://localhost:8545")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
TOKEN_ADDRESS = os.getenv("TOKEN_ADDRESS", "")


@dataclass
class TokenManager:
    """Wrapper around ERC20-compatible token contract."""

    web3: Web3
    contract: any

    @classmethod
    def connect(cls, rpc_url: str | None = None, token_address: str | None = None) -> "TokenManager":
        """Create manager from environment configuration."""
        w3 = Web3(Web3.HTTPProvider(rpc_url or RPC_URL))
        abi = [
            {
                "name": "mint",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    {"name": "to", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                ],
                "outputs": [],
            },
            {
                "name": "transfer",
                "type": "function",
                "stateMutability": "nonpayable",
                "inputs": [
                    {"name": "to", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                ],
                "outputs": [{"name": "", "type": "bool"}],
            },
        ]
        address = token_address or Web3.to_checksum_address(TOKEN_ADDRESS)
        contract = w3.eth.contract(address=address, abi=abi)
        return cls(w3, contract)

    def _build_tx(self) -> dict:
        """Create a basic transaction dict with nonce and gas."""
        account = self.web3.eth.account.from_key(PRIVATE_KEY)
        return {
            "from": account.address,
            "nonce": self.web3.eth.get_transaction_count(account.address),
            "gas": 3000000,
            "gasPrice": self.web3.to_wei("2", "gwei"),
        }

    def mint(self, to: str, amount: int) -> str:
        """Mint tokens."""
        tx = self.contract.functions.mint(to, amount).build_transaction(self._build_tx())
        signed = self.web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        return tx_hash.hex()

    def transfer(self, to: str, amount: int) -> str:
        """Transfer tokens."""
        tx = self.contract.functions.transfer(to, amount).build_transaction(self._build_tx())
        signed = self.web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        return tx_hash.hex()
