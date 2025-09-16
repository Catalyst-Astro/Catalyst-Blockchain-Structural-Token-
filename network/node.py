import threading
import time
import requests
from simplechain.blockchain import Blockchain, Block, Transaction, block_hash
from .peer_manager import PeerManager
from .block_propagator import propagate_block, propagate_transaction
from .flask_api import create_app


class Node:
    """Basic P2P blockchain node."""

    def __init__(self, name, host='127.0.0.1', port=5000, peers=None):
        self.name = name
        self.host = host
        self.port = port
        self.blockchain = Blockchain()
        self.peer_manager = PeerManager(peers)
        self.app = create_app(self)
        self._server_thread = None

    # --- utility conversion helpers ---
    @staticmethod
    def block_to_dict(block: Block) -> dict:
        return {
            'index': block.index,
            'previous_hash': block.previous_hash,
            'timestamp': block.timestamp,
            'transactions': [tx.__dict__ for tx in block.transactions],
            'nonce': block.nonce,
            'hash': block.hash,
        }

    @staticmethod
    def dict_to_block(data: dict) -> Block:
        txs = [Transaction(**tx) for tx in data['transactions']]
        blk = Block(data['index'], data['previous_hash'], data['timestamp'], txs, nonce=data.get('nonce', 0))
        blk.hash = data['hash']
        return blk

    # --- chain verification ---
    def _valid_chain(self, chain):
        for i in range(1, len(chain)):
            prev = chain[i - 1]
            curr = chain[i]
            if curr.previous_hash != prev.hash:
                return False
            if curr.hash != block_hash(curr.index, curr.previous_hash, curr.timestamp, curr.transactions, curr.nonce):
                return False
            if not curr.hash.startswith('0' * self.blockchain.difficulty):
                return False
            for tx in curr.transactions:
                if not tx.verify():
                    return False
        return True

    # --- transaction and block management ---
    def add_transaction(self, data: dict) -> bool:
        tx = Transaction(data['sender'], data['recipient'], data['amount'], data['signature'])
        if self.blockchain.new_transaction(tx):
            propagate_transaction(data, self.peer_manager.peers)
            return True
        return False

    def accept_block(self, data: dict) -> bool:
        if not data:
            return False
        block = self.dict_to_block(data)
        if block.previous_hash != self.blockchain.last_block.hash:
            return False
        if not block.hash.startswith('0' * self.blockchain.difficulty):
            return False
        if block.hash != block_hash(block.index, block.previous_hash, block.timestamp, block.transactions, block.nonce):
            return False
        for tx in block.transactions:
            if not tx.verify():
                return False
        self.blockchain.chain.append(block)
        propagate_block(data, self.peer_manager.peers)
        return True

    # --- consensus ---
    def resolve_conflicts(self) -> bool:
        longest = self.blockchain.chain
        for peer in list(self.peer_manager.peers):
            try:
                r = requests.get(f'http://{peer}/chain', timeout=3)
                if r.status_code == 200:
                    remote = [self.dict_to_block(b) for b in r.json()['chain']]
                    if len(remote) > len(longest) and self._valid_chain(remote):
                        longest = remote
            except requests.RequestException:
                pass
        if longest != self.blockchain.chain:
            self.blockchain.chain = longest
            return True
        return False

    # --- server control ---
    def run(self):
        if self._server_thread:
            return
        self._server_thread = threading.Thread(target=self.app.run, kwargs={'host': self.host, 'port': self.port}, daemon=True)
        self._server_thread.start()
        print(f'{self.name} running on {self.host}:{self.port}')
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
