import json
import time
from typing import List, Tuple
from .p2p import Node

class SPVNode(Node):
    """Simplified Payment Verification (light) node."""

    def __init__(self, host: str, port: int, peers: List[Tuple[str, int]] | None = None):
        super().__init__(host, port, peers)
        self.headers: List[dict] = []

    def start(self):
        super().start()
        self.broadcast({'type': 'GET_HEADERS'})

    def on_message(self, message: dict, conn):
        if message.get('type') == 'HEADERS':
            self.headers = message['headers']

if __name__ == '__main__':
    import sys
    host = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 5001
    peer_args = sys.argv[3:]
    peers = []
    for arg in peer_args:
        h, p = arg.split(':')
        peers.append((h, int(p)))
    node = SPVNode(host, port, peers)
    node.start()
    print(f'SPV node running on {host}:{port}')
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        node.stop()
