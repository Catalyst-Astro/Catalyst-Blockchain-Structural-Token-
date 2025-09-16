import threading
import time
import requests
from network.node import Node
from network.block_propagator import propagate_block
from simplechain.wallet import Wallet


def wait_for_length(port, length, timeout=5):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f'http://127.0.0.1:{port}/chain')
            if r.status_code == 200 and r.json()['length'] >= length:
                return True
        except requests.RequestException:
            pass
        time.sleep(0.2)
    return False


def start_node(node):
    t = threading.Thread(target=node.run, daemon=True)
    t.start()
    return t


def test_sync_between_two_nodes():
    node_a = Node('A', port=5061)
    node_b = Node('B', port=5062, peers=['127.0.0.1:5061'])
    node_a.peer_manager.add_peer('127.0.0.1:5062')
    start_node(node_a)
    start_node(node_b)
    time.sleep(1)

    w1 = Wallet()
    w2 = Wallet()
    msg = f"{w1.public_key}{w2.public_key}1".encode()
    tx = {
        'sender': w1.public_key,
        'recipient': w2.public_key,
        'amount': 1,
        'signature': w1.sign(msg)
    }
    requests.post('http://127.0.0.1:5061/add_transaction', json=tx)
    block = node_a.blockchain.new_block()
    propagate_block(node_a.block_to_dict(block), node_a.peer_manager.peers)

    assert wait_for_length(5062, len(node_a.blockchain.chain))
    requests.get('http://127.0.0.1:5062/resolve')
    assert wait_for_length(5062, len(node_a.blockchain.chain))
