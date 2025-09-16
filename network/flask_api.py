"""Flask REST API exposing blockchain operations."""
from flask import Flask, request, jsonify


def create_app(node):
    app = Flask(__name__)

    @app.route('/chain', methods=['GET'])
    def chain():
        chain_data = [node.block_to_dict(b) for b in node.blockchain.chain]
        return jsonify({'length': len(chain_data), 'chain': chain_data})

    @app.route('/add_block', methods=['POST'])
    def add_block():
        data = request.get_json() or {}
        if node.accept_block(data.get('block')):
            return jsonify({'message': 'block accepted'}), 201
        return jsonify({'message': 'block rejected'}), 400

    @app.route('/add_transaction', methods=['POST'])
    def add_transaction():
        data = request.get_json() or {}
        if node.add_transaction(data):
            return jsonify({'message': 'transaction accepted'}), 201
        return jsonify({'message': 'invalid transaction'}), 400

    @app.route('/peers', methods=['GET', 'POST'])
    def peers():
        if request.method == 'POST':
            peer = request.get_json().get('peer')
            node.peer_manager.add_peer(peer)
            return jsonify({'peers': node.peer_manager.list_peers()}), 201
        return jsonify({'peers': node.peer_manager.list_peers()})

    @app.route('/resolve', methods=['GET'])
    def resolve():
        replaced = node.resolve_conflicts()
        msg = 'replaced' if replaced else 'ok'
        return jsonify({'message': msg})

    return app
