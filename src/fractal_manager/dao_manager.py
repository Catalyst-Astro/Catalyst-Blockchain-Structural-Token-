"""DAO management utilities."""
from __future__ import annotations

import os
from dataclasses import dataclass
from dotenv import load_dotenv
from web3 import Web3


load_dotenv()

RPC_URL = os.getenv("RPC_URL", "http://localhost:8545")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
DAO_CONTROLLER_ADDRESS = os.getenv("DAO_CONTROLLER_ADDRESS", "")


@dataclass
class DAOManager:
    """Interact with simple DAO controller contract."""

    web3: Web3
    contract: any

    @classmethod
    def connect(cls, rpc_url: str | None = None, controller_address: str | None = None) -> "DAOManager":
        """Instantiate DAO manager using env variables."""
        w3 = Web3(Web3.HTTPProvider(rpc_url or RPC_URL))
        abi = [
            {
                "name": "createProposal",
                "type": "function",
                "inputs": [{"name": "text", "type": "string"}],
                "outputs": [{"name": "id", "type": "uint256"}],
                "stateMutability": "nonpayable",
            },
            {
                "name": "vote",
                "type": "function",
                "inputs": [
                    {"name": "proposalId", "type": "uint256"},
                    {"name": "support", "type": "bool"},
                ],
                "outputs": [],
                "stateMutability": "nonpayable",
            },
            {
                "name": "getProposals",
                "type": "function",
                "inputs": [],
                "outputs": [{"name": "", "type": "string[]"}],
                "stateMutability": "view",
            },
        ]
        address = controller_address or Web3.to_checksum_address(DAO_CONTROLLER_ADDRESS)
        contract = w3.eth.contract(address=address, abi=abi)
        return cls(w3, contract)

    def _build_tx(self) -> dict:
        account = self.web3.eth.account.from_key(PRIVATE_KEY)
        return {
            "from": account.address,
            "nonce": self.web3.eth.get_transaction_count(account.address),
            "gas": 3000000,
            "gasPrice": self.web3.to_wei("2", "gwei"),
        }

    def create_proposal(self, text: str) -> str:
        tx = self.contract.functions.createProposal(text).build_transaction(self._build_tx())
        signed = self.web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        return tx_hash.hex()

    def vote(self, proposal_id: int, support: bool) -> str:
        tx = self.contract.functions.vote(proposal_id, support).build_transaction(self._build_tx())
        signed = self.web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        return tx_hash.hex()

    def list_proposals(self) -> list[str]:
        return self.contract.functions.getProposals().call()
