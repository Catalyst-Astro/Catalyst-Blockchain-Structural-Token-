"""Blockchain interoperability interfaces for Ethereum, Bitcoin and IPFS.

This module uses open source libraries to provide basic connectivity
and wrapped token operations for Ethereum, Bitcoin and IPFS. It is
intended as a lightweight starting point for bridge implementations.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from web3 import Web3
from web3.exceptions import ContractLogicError
from bitcoin import SelectParams
from bitcoin.core import lx
from bitcoin.core import COIN
from bitcoin.wallet import CBitcoinSecret, P2PKHBitcoinAddress
from bitcoin.rpc import RawProxy as BitcoinProxy
import ipfshttpclient


@dataclass
class EthereumConfig:
    provider_url: str


@dataclass
class BitcoinConfig:
    rpc_url: str
    network: str = "mainnet"


@dataclass
class IPFSConfig:
    address: str = "/dns/localhost/tcp/5001/http"


class BlockchainBridge:
    """Simple interface for interacting with multiple blockchains."""

    def __init__(
        self,
        eth_cfg: EthereumConfig,
        btc_cfg: BitcoinConfig,
        ipfs_cfg: Optional[IPFSConfig] = None,
    ) -> None:
        self.web3 = Web3(Web3.HTTPProvider(eth_cfg.provider_url))
        SelectParams(btc_cfg.network)
        self.btc = BitcoinProxy(service_url=btc_cfg.rpc_url)
        self.ipfs = ipfshttpclient.connect(ipfs_cfg.address if ipfs_cfg else IPFSConfig().address)

    # --- Ethereum ----------------------------------------------------------
    def get_eth_balance(self, address: str) -> int:
        """Return the balance of an Ethereum address in Wei."""
        return self.web3.eth.get_balance(address)

    def wrap_eth(self, account: str, private_key: str, amount_wei: int, weth_contract: str) -> str:
        """Convert ETH to WETH via the standard deposit method."""
        contract = self.web3.eth.contract(address=weth_contract, abi=[{"name": "deposit", "type": "function", "stateMutability": "payable", "inputs": []}])
        nonce = self.web3.eth.get_transaction_count(account)
        tx = contract.functions.deposit().build_transaction({
            "from": account,
            "value": amount_wei,
            "nonce": nonce,
        })
        signed = self.web3.eth.account.sign_transaction(tx, private_key)
        tx_hash = self.web3.eth.send_raw_transaction(signed.rawTransaction)
        return self.web3.to_hex(tx_hash)

    # --- Bitcoin -----------------------------------------------------------
    def get_btc_balance(self, address: str) -> float:
        """Return the balance of a Bitcoin address in BTC."""
        return self.btc.getreceivedbyaddress(address)

    def wrap_btc(self, wif: str, dest_address: str, amount_btc: float) -> str:
        """Send BTC to a wrapping address for cross chain conversion."""
        key = CBitcoinSecret(wif)
        from_addr = P2PKHBitcoinAddress.from_pubkey(key.pub)
        utxos = self.btc.listunspent(0, 9999999, [str(from_addr)])
        if not utxos:
            raise ValueError("No UTXOs available")
        utxo = utxos[0]
        txid = lx(utxo["txid"])
        vout = utxo["vout"]
        txin = {"txid": txid, "vout": vout}
        value = int(amount_btc * COIN)
        txout = {"to": dest_address, "value": value}
        raw = self.btc.createrawtransaction([txin], {dest_address: amount_btc})
        signed = self.btc.signrawtransactionwithkey(raw, [str(key)])
        tx_hash = self.btc.sendrawtransaction(signed["hex"])
        return tx_hash

    # --- IPFS --------------------------------------------------------------
    def add_file(self, path: str) -> str:
        """Add a file to IPFS and return its hash."""
        res = self.ipfs.add(path)
        return res["Hash"]

    def get_file(self, ipfs_hash: str, dest: str) -> None:
        """Download a file from IPFS to the given destination path."""
        self.ipfs.get(ipfs_hash, dest)

