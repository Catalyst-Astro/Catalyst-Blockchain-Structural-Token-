from flask import Flask, jsonify, request

app = Flask(__name__)

# In-memory placeholder data
wallets = []
nodes = []
explorers = []

@app.route('/')
def index():
    return jsonify({"message": "Catalyst Blockchain API"})

# Wallet endpoints
@app.route('/wallets', methods=['GET', 'POST'])
def wallet_collection():
    if request.method == 'POST':
        data = request.get_json() or {}
        wallet = {
            "id": len(wallets) + 1,
            "name": data.get("name", "Unnamed Wallet")
        }
        wallets.append(wallet)
        return jsonify(wallet), 201
    return jsonify(wallets)

# Node endpoints
@app.route('/nodes', methods=['GET', 'POST'])
def node_collection():
    if request.method == 'POST':
        data = request.get_json() or {}
        node = {
            "id": len(nodes) + 1,
            "address": data.get("address", "")
        }
        nodes.append(node)
        return jsonify(node), 201
    return jsonify(nodes)

# Explorer endpoints
@app.route('/explorers', methods=['GET', 'POST'])
def explorer_collection():
    if request.method == 'POST':
        data = request.get_json() or {}
        explorer = {
            "id": len(explorers) + 1,
            "url": data.get("url", "")
        }
        explorers.append(explorer)
        return jsonify(explorer), 201
    return jsonify(explorers)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
