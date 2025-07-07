import json
import time
from typing import List, Tuple
from .p2p import Node
from .block import Block, create_genesis_block

class FullNode(Node):
    """Node that stores the entire blockchain and can mine blocks."""

    def __init__(self, host: str, port: int, peers: List[Tuple[str, int]] | None = None, difficulty: int = 2):
        super().__init__(host, port, peers)
        self.blockchain: List[Block] = [create_genesis_block()]
        self.difficulty = difficulty

    def mine_block(self, data: str):
        previous = self.blockchain[-1]
        block = Block(len(self.blockchain), previous.hash or '', time.time(), data)
        block.mine(self.difficulty)
        self.blockchain.append(block)
        self.broadcast({'type': 'BLOCK', 'block': block.__dict__})

    def on_message(self, message: dict, conn):
        if message.get('type') == 'BLOCK':
            self._handle_block(message['block'])
        elif message.get('type') == 'GET_HEADERS':
            headers = [{'index': b.index, 'hash': b.hash} for b in self.blockchain]
            try:
                conn.sendall((json.dumps({'type': 'HEADERS', 'headers': headers}) + '\n').encode())
            except OSError:
                pass

    def _handle_block(self, data: dict):
        block = Block(**data)
        if self._validate_block(block):
            if block.index == len(self.blockchain):
                self.blockchain.append(block)

    def _validate_block(self, block: Block) -> bool:
        if block.index != len(self.blockchain):
            return False
        previous_hash = self.blockchain[-1].hash
        if block.previous_hash != previous_hash:
            return False
        return block.compute_hash().startswith('0' * self.difficulty)

if __name__ == '__main__':
    import sys
    host = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 5000
    peer_args = sys.argv[3:]
    peers = []
    for arg in peer_args:
        h, p = arg.split(':')
        peers.append((h, int(p)))
    node = FullNode(host, port, peers)
    node.start()
    print(f'Full node running on {host}:{port}')
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        node.stop()
