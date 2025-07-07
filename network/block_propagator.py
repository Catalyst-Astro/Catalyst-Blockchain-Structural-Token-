"""Utility functions for propagating blocks and transactions to peers."""
import requests


def propagate_block(block_data, peers):
    for peer in list(peers):
        try:
            requests.post(f"http://{peer}/add_block", json={"block": block_data}, timeout=3)
        except requests.RequestException:
            pass


def propagate_transaction(tx_data, peers):
    for peer in list(peers):
        try:
            requests.post(f"http://{peer}/add_transaction", json=tx_data, timeout=3)
        except requests.RequestException:
            pass
