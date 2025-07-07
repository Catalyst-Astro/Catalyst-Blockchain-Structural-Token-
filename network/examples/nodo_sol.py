from network.node import Node

if __name__ == '__main__':
    node = Node('NodoSol', port=5001, peers=['127.0.0.1:5002', '127.0.0.1:5003'])
    node.run()
