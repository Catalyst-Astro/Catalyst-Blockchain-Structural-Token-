#!/usr/bin/env python3
"""Verify the genesis block hash of a node."""
import os
from web3 import Web3

RPC_URL = os.environ.get("RPC_URL", "http://localhost:8545")

w3 = Web3(Web3.HTTPProvider(RPC_URL))

if not w3.isConnected():
    raise SystemExit(f"Unable to connect to {RPC_URL}")

block0 = w3.eth.get_block(0)
print(f"Genesis block hash: {block0.hash.hex()}")
