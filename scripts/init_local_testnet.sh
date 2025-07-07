#!/bin/bash
set -euo pipefail

# This script initializes and starts a local geth testnet.
# Requirements: geth installed in PATH.

DATA_DIR="./local-chain"
GENESIS_FILE="$DATA_DIR/genesis.json"

if [ ! -d "$DATA_DIR" ]; then
    mkdir -p "$DATA_DIR"
fi

cat > "$GENESIS_FILE" <<'GENESIS'
{
  "config": {
    "chainId": 12345,
    "homesteadBlock": 0,
    "eip155Block": 0,
    "eip158Block": 0
  },
  "difficulty": "0x20000",
  "gasLimit": "0x2fefd8",
  "alloc": {}
}
GENESIS

# Initialize chain data
geth --datadir "$DATA_DIR" init "$GENESIS_FILE"

# Start geth node in the background
geth --datadir "$DATA_DIR" \
     --networkid 12345 \
     --http --http.addr 0.0.0.0 --http.api eth,net,web3 \
     --nodiscover \
     --allow-insecure-unlock &

GETH_PID=$!
echo "Geth started with PID $GETH_PID"

# Wait a bit for geth to start
sleep 3

# Output current block number
curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://localhost:8545 | jq

wait $GETH_PID
