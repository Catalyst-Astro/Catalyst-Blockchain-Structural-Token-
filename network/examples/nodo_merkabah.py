from network.node import Node

if __name__ == '__main__':
    node = Node('NodoMerkabah', port=5003, peers=['127.0.0.1:5001', '127.0.0.1:5002'])
    node.run()
