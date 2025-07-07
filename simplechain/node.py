import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import time
import requests
from .blockchain import Blockchain, Transaction
from .wallet import Wallet


class NodeHandler(BaseHTTPRequestHandler):
    node = None  # type: Node

    def _set_response(self, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

    def do_GET(self):
        if self.path == '/chain':
            data = {
                'length': len(self.node.blockchain.chain),
                'chain': [block.__dict__ for block in self.node.blockchain.chain]
            }
            self._set_response()
            self.wfile.write(json.dumps(data).encode())
        else:
            self._set_response(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        if self.path == '/transactions/new':
            data = json.loads(body)
            tx = Transaction(data['sender'], data['recipient'], data['amount'], data['signature'])
            success = self.node.blockchain.new_transaction(tx)
            if success:
                self._set_response(201)
                self.wfile.write(json.dumps({'message': 'Transaction will be added'}).encode())
            else:
                self._set_response(400)
                self.wfile.write(json.dumps({'message': 'Invalid transaction'}).encode())
        elif self.path == '/mine':
            block = self.node.blockchain.new_block()
            self._set_response(200)
            self.wfile.write(json.dumps({'message': 'New Block Forged', 'index': block.index}).encode())
            self.node.broadcast_block(block)
        elif self.path == '/nodes/register':
            data = json.loads(body)
            nodes = data.get('nodes', [])
            for node in nodes:
                self.node.register_node(node)
            self._set_response(201)
            self.wfile.write(json.dumps({'message': 'Nodes added'}).encode())
        else:
            self._set_response(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())


class Node:
    def __init__(self, host='0.0.0.0', port=8000, peers=None):
        self.host = host
        self.port = port
        self.peers = set(peers or [])
        self.blockchain = Blockchain()
        self.wallet = Wallet()

    def register_node(self, address: str):
        parsed = urlparse(address)
        if parsed.netloc:
            self.peers.add(parsed.netloc)
        elif parsed.path:
            self.peers.add(parsed.path)

    def broadcast_block(self, block):
        for peer in list(self.peers):
            try:
                url = f'http://{peer}/chain'
                requests.post(f'http://{peer}/nodes/register', json={'nodes': [f'{self.host}:{self.port}']})
            except requests.RequestException:
                pass

    def run(self):
        NodeHandler.node = self
        server = HTTPServer((self.host, self.port), NodeHandler)
        print(f'Node running on {self.host}:{self.port}')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()


def main(argv=None):
    if argv is None:
        argv = sys.argv[1:]
    port = int(argv[0]) if argv else 8000
    node = Node(port=port)
    node.run()


if __name__ == '__main__':
    main()
