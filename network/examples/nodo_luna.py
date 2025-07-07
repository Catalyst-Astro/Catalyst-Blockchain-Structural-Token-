from network.node import Node

if __name__ == '__main__':
    node = Node('NodoLuna', port=5002, peers=['127.0.0.1:5001', '127.0.0.1:5003'])
    node.run()
